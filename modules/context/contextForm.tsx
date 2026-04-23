"use client";

import React from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { ArrowBigLeftDash, Building2, Coins, Globe, ListChecks } from "lucide-react";

import { Stepper } from "@/components/custom/Stepper";
import { Step, StepValue } from "@/types/components/stepper";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { selectPermisos } from "@/store/permisos/permisosSlice";
import { runClientLogoutFlow } from "@/lib/auth/clientLogout";

import { PermisosCentroCosto, PermisosEmpresa, PermisosPais } from "@/types/permisos/permisos";
import { CatalogoEntry, ContextFormProps, Ctx, entry, isStepValueInList } from "@/types/permisos/context";

import FLAG_1001 from "@/assets/banderas/1001.svg";
import FLAG_1002 from "@/assets/banderas/1002.svg";
import FLAG_1005 from "@/assets/banderas/1005.svg";
import { setcontext } from "@/store/context/contextSlice";
import type { AppDispatch } from "@/store";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";

/**
 * Definición fija de pasos.
 * `as const` permite inferir los values como literals: 1 | 2 | 3 | 4
 */
const stepsDef = [
  { value: 1, icon: <Globe />, title: "País" },
  { value: 2, icon: <Building2 />, title: "Empresa" },
  { value: 3, icon: <Coins />, title: "Centro de costo" },
  { value: 4, icon: <ListChecks />, title: "Acciones" },
] as const;

/**
 * Tipo real de step inferido desde stepsDef.
 * Queda: 1 | 2 | 3 | 4
 */
type StepValueReal = (typeof stepsDef)[number]["value"];

export default function ContextForm({ onDone }: ContextFormProps) {
  const router = useRouter();
  const permisos = useSelector(selectPermisos);
  const dispatch = useDispatch<AppDispatch>();
  const pathname = usePathname();

  /**
   * Lista de values válidos para reutilizar en el type guard.
   */
  const allowedSteps = stepsDef.map((s) => s.value) as readonly StepValueReal[];

  /**
   * Estado del step actual.
   */
  const [step, setStep] = React.useState<StepValueReal>(1);

  /**
   * Estado de selecciones actuales.
   */
  const [paisId, setPaisId] = React.useState<PermisosPais | null>(null);
  const [empresaId, setEmpresaId] = React.useState<PermisosEmpresa | null>(null);
  const [ccId, setCcId] = React.useState<PermisosCentroCosto | null>(null);

  /**
   * Steps listos para el componente Stepper.
   */
  const steps: Step[] = React.useMemo(() => stepsDef.map((s) => ({ ...s })), []);

  /**
   * Catálogo derivado del store.
   */
  const paises = React.useMemo(() => Object.values(permisos?.permisos.paises || {}), [permisos]);
  const empresas = React.useMemo(() => Object.values(paisId?.empresas || {}), [paisId]);
  const centros = React.useMemo(() => Object.values(empresaId?.centrosCosto || {}), [empresaId]);

  /**
   * Contexto reducido que se guarda en storage.
   * Se eliminan ramas grandes para no guardar estructuras innecesarias.
   */
  function buildCtx() {
    if (!paisId || !empresaId || !ccId) return null;

    return {
      paisId: { ...paisId, empresas: undefined },
      empresaId: { ...empresaId, centrosCosto: undefined },
      centroCostoId: { ...ccId, modulos: undefined },
    };
  }

  /**
   * Guarda el contexto solo para la pestaña actual.
   * Además, si no existe un ctx_default, lo crea una sola vez.
   */
  function continuar() {
    const ctx = buildCtx();
    if (!ctx) return;
    if (onDone) {
      onDone();
    }
    if (!localStorage.getItem("ctx_default")) {
      localStorage.setItem("ctx_default", JSON.stringify(ctx));
    }

    sessionStorage.setItem("ctx", JSON.stringify(ctx));

    dispatch(setcontext(ctx as Ctx));

    if (!onDone) {
      router.replace("/dashboard");
    }
  }

  /**
   * Guarda el contexto como predeterminado global
   * y también lo aplica a la pestaña actual.
   */
  function guardarComoPredeterminado() {
    const ctx = buildCtx();
    if (!ctx) return;
    if (onDone) {
      onDone();
    }
    localStorage.setItem("ctx_default", JSON.stringify(ctx));
    sessionStorage.setItem("ctx", JSON.stringify(ctx));

    dispatch(setcontext(ctx as Ctx));

    if (!onDone) {
      router.replace("/dashboard");
    }
  }

  /**
   * Se habilitan botones finales solo cuando ya existe la selección completa.
   */
  const canContinue = !!paisId && !!empresaId && !!ccId;

  /**
   * Devuelve la bandera visual según el país.
   */
  function renderBandera(p: PermisosPais, w = 50) {
    if (p.cod_pais === 1001) return <Image src={FLAG_1001} alt="" width={w} />;
    if (p.cod_pais === 1002) return <Image src={FLAG_1002} alt="" width={w} />;
    if (p.cod_pais === 1005) return <Image src={FLAG_1005} alt="" width={w} />;
    return null;
  }

  /**
   * Catálogo principal según el step actual.
   * Cada step tiene su propia lista y comportamiento.
   */
  const catalogoOpciones = React.useMemo<Record<StepValueReal, CatalogoEntry<StepValueReal>>>(() => {
    return {
      1: entry<PermisosPais, StepValueReal>({
        label: "Paises",
        options: paises,
        getKey: (p) => p.cod_pais,
        getLabel: (p) => p.nombre_pais ?? "",
        isSelected: (p) => paisId?.cod_pais === p.cod_pais,
        onSelect: (p) => setPaisId(p),
        nextStep: 2,
        bandera: renderBandera,
      }),

      2: entry<PermisosEmpresa, StepValueReal>({
        label: "Empresas",
        options: empresas,
        getKey: (p) => p.cod_empresa,
        getLabel: (p) => p.nombre_emp ?? "",
        isSelected: (p) => empresaId?.cod_empresa === p.cod_empresa,
        onSelect: (p) => setEmpresaId(p),
        nextStep: 3,
      }),

      3: entry<PermisosCentroCosto, StepValueReal>({
        label: "Centros de Costo",
        options: centros,
        getKey: (p) => p.cod_cc,
        getLabel: (p) => p.nombre_cc ?? "",
        isSelected: (p) => ccId?.cod_cc === p.cod_cc,
        onSelect: (p) => setCcId(p),
        nextStep: 4,
      }),

      /**
       * Placeholder del step 4.
       * Aquí luego puedes conectar acciones reales.
       */
      4: {
        label: "Acciones",
        options: [],
        getKey: () => "",
        getLabel: () => "",
        isSelected: () => false,
        onSelect: () => { },
        nextStep: 4,
      },
    };
  }, [paises, empresas, centros, paisId?.cod_pais, empresaId?.cod_empresa, ccId?.cod_cc]);

  /**
   * Al montar el componente, intenta reconstruir el contexto guardado.
   * Primero revisa default global, luego contexto de sesión.
   */
  React.useEffect(() => {
    let ctx = null;

    if (sessionStorage.getItem("ctx")) {
      ctx = JSON.parse(sessionStorage.getItem("ctx")!);
    } else if (localStorage.getItem("ctx_default")) {
      ctx = JSON.parse(localStorage.getItem("ctx_default")!);
    }

    if (!ctx) return;

    const currentPais = permisos?.permisos.paises?.[ctx?.paisId?.cod_pais] ?? null;
    setPaisId(currentPais);

    if (!currentPais) {
      setStep(1);
      return;
    }

    const currentEmpresa = currentPais.empresas?.[ctx?.empresaId?.cod_empresa] ?? null;
    setEmpresaId(currentEmpresa);

    if (!currentEmpresa) {
      setStep(2);
      return;
    }

    const currentCentroCosto = currentEmpresa.centrosCosto?.[ctx?.centroCostoId?.cod_cc] ?? null;
    setCcId(currentCentroCosto);

    if (!currentCentroCosto) {
      setStep(3);
      return;
    }

    setStep(4);
  }, [permisos]);

  /**
   * Configuración del step actual.
   */
  const cfg = catalogoOpciones[step];

  /**
   * Cierra sesión en backend/client y redirige a login.
   */
  async function handleLogout(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    await runClientLogoutFlow({
      dispatch,
      router,
      redirectTo: "/login",
      pathname,
    });
  }

  /**
   * Resetea estados dependientes cuando cambias una selección superior.
   * Ejemplo:
   * - si cambia país, empresa y cc dejan de ser válidos
   * - si cambia empresa, cc deja de ser válido
   */
  function resetEstadosDependientes(currentStep: StepValueReal) {
    if (currentStep === 1) {
      setEmpresaId(null);
      setCcId(null);
      return;
    }

    if (currentStep === 2) {
      setCcId(null);
    }
  }

  /**
   * Render genérico para botón de catálogo / resumen seleccionado.
   * Recibe `unknown` porque el render trabaja sobre CatalogoEntry unificado.
   */
  const renderButton = (p: unknown, currentCfg: CatalogoEntry<StepValueReal>, readonly: boolean = false) => {
    return (
      <div
        key={currentCfg.getKey(p)}
        // variant="ghost"
        className={cn(
          "flex flex-col justify-center items-center h-fit text-center p-2",
          "bg-background/20 hover:bg-transparent",
          "dark:bg-background/20 dark:hover:bg-transparent",
          "hover:text-foreground",
          "max-w-[15vw] min-w-[15vw]",
          "rounded-2xl border",
          "text-2xl",
          readonly ? "border-0" : "border-3 border-primary/70 hover:border-primary-icon hover:border-5 hover:shadow",
          readonly ? "dark:border-0" : "dark:border-3 dark:border-primary/70 dark:hover:border-primary-icon dark:hover:border-5 dark:hover:shadow",
          readonly ? "opacity-100! w-full p-2" : "p-5",
          currentCfg.isSelected(p) ? "opacity-100" : "opacity-80",
        )}
        onClick={() => {
          if (readonly) return;

          currentCfg.onSelect(p);
          resetEstadosDependientes(step);

          if (currentCfg.nextStep) {
            setStep(currentCfg.nextStep);
          }
        }}
      // type="button"
      // disabled={readonly}
      >
        {currentCfg.bandera ? currentCfg.bandera(p, 45) : null}
        <h2>
          <span className="md:text-2xl">{currentCfg.getLabel(p)}</span>
        </h2>
      </div>
    );
  };

  /**
   * Maneja click manual en el stepper.
   * También limpia estados dependientes cuando retrocedes.
   */
  function handleStepChange(next: StepValue) {
    if (!isStepValueInList(next, allowedSteps)) return;

    const nextStep = Number(next) as StepValueReal;
    setStep(nextStep);

    if (nextStep === 1) {
      setPaisId(null);
      setEmpresaId(null);
      setCcId(null);
      return;
    }

    if (nextStep === 2) {
      setEmpresaId(null);
      setCcId(null);
      return;
    }

    if (nextStep === 3) {
      setCcId(null);
    }
  }

  return (
    <section className="bg-transparent min-w-full">
      <div className="hidden sm:block">
        <Stepper steps={steps} value={step} allowStepClick onValueChange={handleStepChange} />
      </div>
      <div className="sm:hidden">
        <Stepper steps={steps} value={step} allowStepClick onValueChange={handleStepChange} orientation="vertical" />
      </div>

      <div className="flex p-5 transition-all flex-col sm:flex-row space-x-2">
        <div className="flex p-5 transition-all sm:flex-col items-center justify-center w-full sm:w-auto">
          {/* <div className="w-auto transition-all "> */}
          <div className={cn("flex-1 justify-center items-center transition-all rounded-md m-2")}>{paisId ? renderButton(paisId, catalogoOpciones[1], true) : ""}</div>

          <div className={cn("flex-1 justify-center items-center transition-all rounded-sm m-2")}>{empresaId ? renderButton(empresaId, catalogoOpciones[2], true) : ""}</div>

          <div className={cn("flex-1 justify-center items-center transition-all rounded-sm m-2")}>{ccId ? renderButton(ccId, catalogoOpciones[3], true) : ""}</div>
          {/* </div> */}
        </div>

        <div className="flex p-5 transition-all sm:flex-col items-center justify-center w-full space-2">
          {step === 4 ?
            <div className="justify-arrownd items-center transition-all rounded-sm p-2  w-full">
              <h2 className="text-2xl">¿Que acciones planea realizar?</h2>
              <div className="flex flex-col items-start mt-5 space-y-3 w-full">
                <div>
                  <Field>
                    <Checkbox />
                    <FieldLabel className="text-lg">- Visualizar información</FieldLabel>
                  </Field>
                </div>
                <span className="text-lg">- Consultar reportes</span>
                <span className="text-lg">- Descargar información</span>
                <span className="text-lg">- Configurar alertas</span>
                <span className="text-lg">- Integrar con otras herramientas</span>
              </div>
            </div>
            : <div className="justify-arrownd items-center transition-all rounded-sm p-2">{catalogoOpciones[step].options?.map((p) => renderButton(p, cfg))}</div>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={handleLogout}>
          <ArrowBigLeftDash />
          Cerrar Sesión
        </Button>

        <div className="grow" />

        {step === 4 && (
          <>
            <Button variant="ghost" onClick={guardarComoPredeterminado} disabled={!canContinue}>
              Guardar como predeterminado
            </Button>

            <Button variant="ghost" onClick={continuar} disabled={!canContinue}>
              Continuar
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
