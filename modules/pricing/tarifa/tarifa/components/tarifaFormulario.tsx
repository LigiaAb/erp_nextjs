"use client";

import { Button } from "@/components/ui/button";
import { useFormulario } from "../hooks/useFormularioTarifas";
import { TipoFormulario } from "@/types/lib/formTypes";
import { CatalogCentroCosto } from "@/fetch/configuracion/accesos";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import AutoCompleteField from "@/components/custom/form/autoCompleteField";
import { CatalogEmpresas } from "../../../../../fetch/configuracion/accesos";
import React from "react";
import { CatalogIncoterm, CatalogRubro, CatalogTipo, CatalogTipoRelacion } from "@/fetch/configuracion/catalogos";
import { InputGroup, InputGroupInput } from "@/components/ui/input-group";
import AsyncAutoCompleteField from "@/components/custom/form/asyncAutoCompleteField";
import { CatalogEntidad } from "../../../../../fetch/entidades/entidadePorCriterio";
import useCatalogosTarifa from "../hooks/useCatalogosTarifas";
import { CATALOGOS_AGREGAR_TODOS, DEFAULT_TODOS_VALUE } from "../lib/tarifaHelppers";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type SelectOptionBase = {
  value: string | number;
  label: string;
};

type FormularioProps = {
  tipoFormulario?: TipoFormulario;
  defaultValues?: Record<string, unknown>;
  handleInsertar?: (payload: Record<string, unknown>) => Promise<void>;
  handleActualizar?: (payload: Record<string, unknown>) => Promise<void>;
  obligatorios?: string[];
  inputsToHide?: string[];
  inputsReadOnly?: string[];
  groupsToHide?: string[];
};

const formatDateForInput = (date: Date | string | null | undefined) => {
  if (!date) return "";
  const d = date instanceof Date ? date : new Date(date);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

export const TarifaFormulario = ({
  tipoFormulario = "ingreso",
  defaultValues,
  handleInsertar,
  handleActualizar,
  obligatorios,
  inputsToHide,
  inputsReadOnly,
  groupsToHide,
}: FormularioProps) => {
  const formId = React.useId();

  const groupclassess: React.ComponentProps<"div">["className"] = React.useMemo(() => cn("grid gap-2 border px-5 pb-5 rounded-lg"), []);

  const {
    catalogos: catalogosProcesados,
    isLoading,
    fetchOptionsProveedores,
  } = useCatalogosTarifa({
    // Opcional: agregar TODOS a ciertos catálogos
    agregarTodos: {
      default: DEFAULT_TODOS_VALUE,
      catalogos: CATALOGOS_AGREGAR_TODOS,
    },
  });

  const { values, onInput, valoresSoloCodigos, verificarSiEsLectura, verificarSiEsVisible, obtenerCatalogoById, verificarSiEsObligatorio } = useFormulario({
    tipoFormulario,
    defaultValues,
    catalogosProcesados,
    isLoading,
    inputsToHide,
    inputsReadOnly,
    obligatorios,
  });

  const handleGuardar = async () => {
    const payload = valoresSoloCodigos();
    if (tipoFormulario === "ingreso") await handleInsertar?.(payload);
    else await handleActualizar?.(payload);
  };

  const generarId = React.useCallback((id: string) => `${tipoFormulario}-${formId}-${id}`, [tipoFormulario, formId]);

  const renderizarSelect = <T extends SelectOptionBase>({
    id,
    label,
    className,
  }: {
    id: string;
    label: string;
    className?: React.ComponentProps<"div">["className"];
  }): React.ReactNode => {
    const id_generado = generarId(id);

    return (
      <AutoCompleteField<T>
        comboboxContentProps={{ className: "z-[9999]" }}
        className={cn(className, !verificarSiEsVisible(id) && "hidden")}
        id={id_generado}
        label={`${verificarSiEsObligatorio(id) ? "* " : ""}${label}`}
        options={obtenerCatalogoById(id) as T[]}
        value={values[id] as T | null}
        onChange={(value) => onInput({ id: id, val: value })}
        getOptionValue={(o) => o.value}
        getOptionLabel={(o) => o.label}
        readOnly={verificarSiEsLectura(id)}
      />
    );
  };
  const renderizarSelectWithSearch = <T extends SelectOptionBase>({
    id,
    label,
    fetcher,
    minSearchLength,
    className,
  }: {
    id: string;
    label: string;
    fetcher: () => Promise<T[]>;
    minSearchLength?: number;
    className?: React.ComponentProps<"div">["className"];
  }): React.ReactNode => {
    const id_generado = generarId(id);

    return (
      <AsyncAutoCompleteField<T>
        comboboxContentProps={{ className: "z-[9999]" }}
        className={cn(className, !verificarSiEsVisible("proveedor") && "hidden")}
        id={id_generado}
        label={label}
        value={values[id] as T}
        onChange={(value) => onInput({ id: id, val: value })}
        fetchOptions={fetcher}
        getOptionValue={(option) => option.value}
        getOptionLabel={(option) => option.label}
        placeholder="Buscar..."
        searchPlaceholder="Buscando..."
        minSearchLength={minSearchLength ?? 2}
        fetchOnEmpty={false}
        clearable
      />
    );
  };

  const renderizarDate = ({ id, label, className }: { id: string; label: string; className?: React.ComponentProps<"div">["className"] }): React.ReactNode => {
    const id_generado = generarId(id);

    return (
      <Field className={cn(className, !verificarSiEsVisible(id) && "hidden")}>
        <FieldLabel htmlFor={id_generado}>{label}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            readOnly={verificarSiEsLectura(id)}
            onChange={(value) => onInput({ id: id, val: value.target?.valueAsDate })}
            id={id_generado}
            type="date"
            value={formatDateForInput(values[id] as Date | string | null | undefined)}
          />
        </InputGroup>
      </Field>
    );
  };
  const renderizarText = ({ id, label, className }: { id: string; label: string; className?: React.ComponentProps<"div">["className"] }): React.ReactNode => {
    const id_generado = generarId(id);

    return (
      <Field className={cn(className, !verificarSiEsVisible("usuario") && "hidden")}>
        <FieldLabel htmlFor={id_generado}>{label}</FieldLabel>
        <InputGroup>
          <InputGroupInput
            readOnly={verificarSiEsLectura(id)}
            onChange={(value) => onInput({ id: id, val: value.target.value })}
            id={id_generado}
            type="text"
            value={(values[id] as string | number | readonly string[] | undefined) ?? ""}
          />
        </InputGroup>
      </Field>
    );
  };
  const renderizarChebox = ({ id, label, className }: { id: string; label: string; className?: React.ComponentProps<"div">["className"] }): React.ReactNode => {
    const id_generado = generarId(id);

    return (
      <Field orientation="horizontal" className={cn(className, !verificarSiEsVisible(id) && "hidden")}>
        <Checkbox id={id_generado} name={id} checked={Boolean(values[id])} onCheckedChange={(checked) => onInput({ id, val: checked === true })} />
        <FieldLabel htmlFor={id_generado}>{label}</FieldLabel>
      </Field>
    );
  };

  if (isLoading) return <p>Cargando...</p>;

  return (
    <div className="space-y-4 p-2 my-5 rounded-2xl bg-muted">
      {/* Renderizar inputs usando values, onInput, verificarSiEsLectura, verificarSiEsVisible */}

      <div className={cn(tipoFormulario === "filtro" ? "grid-cols-1" : "md:grid-cols-2 grid-cols-1", "grid gap-1")}>
        {/* GRUPO 1 AUDITORÍA  */}
        {/* INCLUYE: EMPRESA, CENTRO COSOTO, FECHA CREACION, FECHA MODIFICACION, USUARIO */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("auditoria") && "hidden")}>
          <p className="col-span-2 text-center">AUDITORÍA </p>
          {renderizarSelect<CatalogEmpresas>({ id: "empresa", label: "Empresa" })}
          {renderizarSelect<CatalogCentroCosto>({ id: "centroCosto", label: "Centro de Costo" })}
          {renderizarDate({ id: "fechaCreacion", label: "Fecha de Creación" })}
          {renderizarDate({ id: "fechaModificacion", label: "Fecha de Modificación" })}
          {renderizarText({ id: "usuario", label: "Usuario", className: "col-span-2" })}
        </FieldGroup>
        {/* GRUPO 2 SERVICIO */}
        {/* INCLUYE: RUBRO, PROVEEDOR, SERVICIO Y SIGLAS */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("servicio") && "hidden")}>
          <p className="col-span-2 text-center">SERVICIO</p>
          {renderizarSelect<CatalogRubro>({ id: "rubro", label: "Rubro" })}
          {renderizarSelectWithSearch<CatalogEntidad>({ id: "proveedor", label: "Proveedor", fetcher: fetchOptionsProveedores })}
          {renderizarText({ id: "nombre", label: "Servicio" })}
          {renderizarText({ id: "siglas", label: "Siglas" })}
        </FieldGroup>
        {/* GRUPO 3 TRANSPORTE */}
        {/* INCLUYE: TIPO DE TRANSPORTE, TIPO DE SERVICIO, CLASIFICACION, CATEGORIA DE TRANSPORTE */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("transporte") && "hidden")}>
          <p className="col-span-2 text-center">TRANSPORTE</p>
          {renderizarSelect<CatalogTipo>({ id: "tipoTransporte", label: "Tipo de Transporte" })}
          {renderizarSelect<CatalogTipoRelacion>({ id: "tipoServicio", label: "Tipo de Servicio" })}
          {renderizarSelect<CatalogTipoRelacion>({ id: "tipoClasificacion", label: "Clasificacion" })}
          {renderizarSelect<CatalogTipoRelacion>({ id: "categoriaTransporte", label: "Categoria de Transporte" })}
          {renderizarChebox({ id: "obligatorio", label: "SELECCION AUTOMATICA EN COTIZACION" })}
        </FieldGroup>
        {/* GRUPO 4 CARGA */}
        {/* INCLUYE: TIPO DE CARGA, CLASIFICACION DE CARGA, INCOTERM Y TIPO DE PAGO */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("carga") && "hidden")}>
          <p className="col-span-2 text-center">CARGA</p>
          {renderizarSelect<CatalogTipo>({ id: "tipoCarga", label: "Tipo de Carga" })}
          {renderizarSelect<CatalogTipoRelacion>({ id: "clasificacionCarga", label: "Clasificacion de carga" })}
          {renderizarSelect<CatalogIncoterm>({ id: "incoterm", label: "Incoterms" })}
          {renderizarSelect<CatalogTipo>({ id: "tipoPago", label: "Tipo de Pago" })}
        </FieldGroup>
        {/* GRUPO 5 CÁLCULO */}
        {/* INCLUYE: TIPO DE APLICACION, TIPO DE CÁLCULO , METODO DE CACLULO */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("calculo") && "hidden")}>
          <p className="col-span-2 text-center">CÁLCULO </p>
          {renderizarSelect<CatalogTipo>({ id: "tipoAplicacion", label: "Clasificacion de aplicacion" })}
          {renderizarSelect<CatalogTipo>({ id: "tipoCalculo", label: "Tipo de Cálculo" })}
          {renderizarSelect<CatalogTipo>({ id: "metodoCalculo", label: "Metodo de Cálculo" })}
        </FieldGroup>
        {/* GRUPO 6 ALCANCE */}
        {/* INCLUYE: APLICADOS A TODOS LOS DESTINOS Y ORIGENES, APLICA A TODOS LOS COMMODITIES Y TIPO DE TARIFA PUBLICA O PRIVADA */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("alcance") && "hidden")}>
          <p className="col-span-2 text-center">ALCANCE</p>
          {renderizarChebox({ id: "aplicaOrigenesDestinos", label: "APLICA A TODOS LOS ORÍGENES Y DESTINOS" })}
          {renderizarChebox({ id: "aplicaCommodities", label: "APLICA A TODOS LOS COMMODITIES" })}
          {renderizarSelect<CatalogTipo>({ id: "tipoTarifa", label: "Tipo de tarifa" })}
        </FieldGroup>
        {/* GRUPO 7 VIGENCIA */}
        {/* INCLUYE: FECHA DE INICIO Y FECHA DE VENCIMIENTO */}
        <FieldGroup className={cn(groupclassess, groupsToHide?.includes("alcance") && "hidden")}>
          <p className="col-span-2 text-center">VIGENCIA</p>
          {renderizarDate({ id: "fechaIncio", label: "Fecha de Inicio" })}
          {renderizarDate({ id: "fechaFin", label: "Fecha de Vencimiento" })}
        </FieldGroup>
        <div className={cn("grid grid-cols-2 gap-2 p-2 items-end")}>
          <div />
          {tipoFormulario !== "lectura" && <Button onClick={handleGuardar}>{tipoFormulario === "ingreso" ? "Agregar" : "Guardar"}</Button>}
        </div>
      </div>

      {/* <pre>{JSON.stringify(catalogosProcesados?.tiposClasificacion, null, 2)}</pre> */}
      {/* <pre>{JSON.stringify(values, null, 2)}</pre> */}
      {/* <pre>
        {JSON.stringify(
          Object.values(values).map((i) => (i instanceof Date && !isNaN(i) ? "Date" : typeof i)),
          null,
          2,
        )}
      </pre> */}
    </div>
  );
};

// export default  TarifaFormulario;
export default TarifaFormulario;
