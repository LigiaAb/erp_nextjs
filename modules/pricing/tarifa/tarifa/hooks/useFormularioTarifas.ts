"use client";

import * as React from "react";
import { fieldRules } from "../lib//tarifaFieldRules";
import { getPlainValue, valoresSoloCodigos as buildValoresSoloCodigos, filtrarValoresPorPayload } from "../lib/transformsTarifa";
import { UseFormularioOptions } from "@/types/lib/formTypes";
import { useSelector } from "react-redux";
import { selectcontext } from "@/store/context/contextSlice";
import { selectAuth } from "@/store/auth/authSlice";
import { CatalogCentroCosto, CatalogEmpresas } from "@/fetch/configuracion/accesos";
import { CatalogTipo, CatalogTipoRelacion } from "@/fetch/configuracion/catalogos";
import { CATALOGOS_AGREGAR_TODOS, DEFAULT_TODOS_VALUE } from "../lib/tarifaHelppers";

// ─── Tipos/helpers mínimos de soporte ────────────────────────────────────────
// Se agregan helpers pequeños para no cambiar la lógica original del hook
// y solo ayudar a TypeScript a entender cuándo un unknown sí se puede usar.

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null;

const isDateInput = (value: unknown): value is string | number | Date => value instanceof Date || typeof value === "string" || typeof value === "number";

// const isPrimitiveComparable = (value: unknown): value is string | number | boolean => ["string", "number", "boolean"].includes(typeof value);

// ─── Hook principal ───────────────────────────────────────────────────────────

export function useFormulario({
  tipoFormulario,
  defaultValues,
  catalogosProcesados,
  isLoading = false,
  inputsReadOnly = [],
  inputsToHide = [],
  groupsToHide = [],
  obligatorios = [],
}: UseFormularioOptions) {
  const ctx = useSelector(selectcontext);
  const usuario = useSelector(selectAuth)?.nombre_completo;

  // ─── Valores iniciales ────────────────────────────────────────────────────────
  // Se mantienen como unknown para no alterar la estructura actual del formulario.
  const DEFAULT_VALUES: Record<string, unknown> = Object.fromEntries(Object.keys(fieldRules).map((key) => [key, fieldRules[key]?.default ?? null]));

  const [values, setValues] = React.useState<Record<string, unknown>>(DEFAULT_VALUES);

  // ─── Valores derivados de los inputs ────────────────────────────────────────
  const esScale = React.useMemo(() => values?.cod_rubro === 134, [values]);

  // ── Valores iniciales derivados de fieldRules ──────────────────────────────
  // Se recalculan desde las reglas para tener una base consistente al inicializar.
  const valoresIniciales = React.useMemo(() => Object.fromEntries(Object.entries(fieldRules).map(([key, regla]) => [key, regla?.default ?? null])), []);

  // ── Conversión: defaultValues (API) → objetos de catálogo ─────────────────
  const defaultValuesProcesados = React.useMemo(() => {
    const resultado: Record<string, unknown> = { ...(defaultValues ?? {}) };
    const ctxValue = ctx ?? {};

    Object.entries(fieldRules).forEach(([campo, regla]) => {
      const codigo = defaultValues?.[regla.cod];
      if (codigo === undefined || codigo === null) return;

      // Fechas
      if (regla.tipo === "datetime") {
        resultado[campo] = isDateInput(codigo) ? new Date(codigo) : null;
        return;
      }

      // Selects
      const catalogo = catalogosProcesados?.[regla.catalogo ?? ""];
      if (Array.isArray(catalogo)) {
        if (campo === "tipoPago") {
          resultado[campo] = catalogo.find((e) => isRecord(e) && e.value === 131) ?? null;
        } else {
          resultado[campo] = catalogo.find((e) => isRecord(e) && e.value === codigo) ?? null;
        }
      }
    });

    // ── Defaults desde ctx para empresa y centroCosto ─────────────────────────
    const empresas = Array.isArray(catalogosProcesados?.empresas) ? catalogosProcesados.empresas : [];

    const centrosCosto = Array.isArray(catalogosProcesados?.centrosCosto) ? catalogosProcesados.centrosCosto : [];

    const getCtxMatchValue = (source: unknown, fallbackKeys: string[]): unknown => {
      if (source === undefined || source === null) return null;

      if (typeof source !== "object") return source;

      // Si ya viene como valor primitivo, se usa directo.
      if (!isRecord(source)) return source;

      if ("value" in source) return source.value;

      for (const key of fallbackKeys) {
        if (key in source) return source[key];
      }

      return null;
    };

    if (resultado.empresa == null) {
      const ctxEmpresaValue = getCtxMatchValue((ctxValue as UnknownRecord)?.empresaId, ["cod_empresa", "empresaId", "id"]);

      if (ctxEmpresaValue !== null) {
        resultado.empresa = empresas.find((e) => isRecord(e) && e.value === ctxEmpresaValue) ?? null;
      }
    }

    if (resultado.centroCosto == null) {
      const ctxCentroCostoValue = getCtxMatchValue((ctxValue as UnknownRecord)?.centroCostoId, ["cod_cc", "centroCostoId", "id"]);

      if (ctxCentroCostoValue !== null) {
        resultado.centroCosto = centrosCosto.find((cc) => isRecord(cc) && cc.value === ctxCentroCostoValue) ?? null;
      }
    }

    resultado.usuario = usuario;

    return resultado;
  }, [defaultValues, catalogosProcesados, ctx, usuario]);

  // ── Helper para obtener catálogo de un campo ───────────────────────────────
  const obtenerCatalogoById = React.useCallback(
    (id: string) => {
      const catalogoId = fieldRules?.[id]?.catalogo;
      if (!catalogoId) return [];

      const validarTotos = (valor: unknown) => {
        if (CATALOGOS_AGREGAR_TODOS[catalogoId as keyof typeof CATALOGOS_AGREGAR_TODOS]) {
          return valor === DEFAULT_TODOS_VALUE;
        }
        return false;
      };

      if (id === "centroCosto") {
        const empresaSeleccionada = values.empresa as CatalogEmpresas | null;

        return ((catalogosProcesados?.[catalogoId] ?? []) as CatalogCentroCosto[]).filter(
          (cc) => cc.cod_empresa_cc === empresaSeleccionada?.value || validarTotos(cc.value),
        );
      }

      if (id === "tipoServicio") {
        const tipoTransporteSeleccionado = values.tipoTransporte as CatalogTipo | null;

        return ((catalogosProcesados?.[catalogoId] ?? []) as CatalogTipoRelacion[]).filter(
          (ts) =>
            (ts.cod_tipo_padre === tipoTransporteSeleccionado?.value && ts.tipo_padre_tabla === "TRANSPORTE" && ts.tipo_tabla === "SERVICIO") ||
            validarTotos(ts.value),
        );
      }

      if (id === "tipoClasificacion") {
        const tipoTransporteSeleccionado = values.tipoTransporte as CatalogTipo | null;

        return ((catalogosProcesados?.[catalogoId] ?? []) as CatalogTipoRelacion[]).filter(
          (ct) =>
            (ct.cod_tipo_padre === tipoTransporteSeleccionado?.value && ct.tipo_padre_tabla === "TRANSPORTE" && ct.tipo_tabla === "CLASIFICACION_SERVICIO") ||
            validarTotos(ct.value),
        );
      }

      if (id === "metodoCalculo") {
        return esScale
          ? ((catalogosProcesados?.metodosCalculo || []) as CatalogTipo[]).filter((td) => td.value === 342)
          : ((catalogosProcesados?.metodosCalculo || []) as CatalogTipo[]).filter((td) => td.value !== 342);
      }

      return catalogosProcesados?.[catalogoId] ?? [];
    },
    [catalogosProcesados, values, esScale],
  );

  // ── Inicialización (solo una vez, cuando catalogos cargan) ─────────────────
  const yaInicializoRef = React.useRef(false);

  React.useEffect(() => {
    if (!usuario) return;
    if (isLoading) return;
    if (yaInicializoRef.current) return;
    if (defaultValues && Object.keys(defaultValuesProcesados).length === 0) return;

    setValues(() => ({ ...valoresIniciales, ...defaultValuesProcesados }));
    yaInicializoRef.current = true;
  }, [isLoading, valoresIniciales, usuario, defaultValuesProcesados]);

  // ── Parchar valores cuando llegan tarde ───────────────────────────────────
  React.useEffect(() => {
    if (!defaultValues) return;
    if (!yaInicializoRef.current) return;

    setValues((prev) => {
      const siguiente = { ...prev };
      Object.keys(defaultValuesProcesados).forEach((key) => {
        if (prev?.[key] === undefined || prev?.[key] === null) {
          siguiente[key] = defaultValuesProcesados[key];
        }
      });
      return siguiente;
    });
  }, [defaultValues, defaultValuesProcesados]);

  // ── onInput: cambiar un campo ──────────────────────────────────────────────
  const onInput = React.useCallback(({ id, val }: { id: string; val: unknown }) => {
    setValues((prev) => {
      if (Object.is(prev?.[id], val)) return prev;

      const next = { ...prev };
      const regla = fieldRules[id];

      if (!regla) {
        next[id] = val;
        return next;
      }

      next[id] = val ?? null;

      // Reset de campos dependientes
      regla.reset?.forEach((keyToReset) => {
        const reglaReset = fieldRules?.[keyToReset];

        next[keyToReset] = fieldRules?.[keyToReset]?.default ?? null;

        if (reglaReset?.cod) {
          next[reglaReset.cod] = getPlainValue(next[keyToReset]);
        }
      });

      const codigo = regla.cod;

      if (codigo) {
        next[codigo] = getPlainValue(next[id]);
      }

      return next;
    });
  }, []);

  // ── Helpers de visibilidad / readonly / require ───────────────────────────

  const verificarSiEsLectura = React.useCallback(
    (id: string): boolean => {
      if (tipoFormulario === "lectura") return true;
      if (inputsReadOnly.includes(id)) return true;
      if (fieldRules[id]?.readonly) return true;

      const require = fieldRules[id]?.require;
      if (!require) return false;

      const requireList = Array.isArray(require) ? require : [require];
      return requireList.some((dep) => !values?.[dep]);
    },
    [tipoFormulario, inputsReadOnly, values],
  );

  const verificarSiEsObligatorio = React.useCallback(
    (id: string): boolean => {
      if (tipoFormulario === "lectura") return false;
      if (obligatorios.includes(id)) return true;
      if (fieldRules[id]?.obligatorio) return true;
      return false;
    },
    [tipoFormulario, obligatorios],
  );

  const verificarSiEsVisible = React.useCallback(
    (id: string): boolean => {
      if (inputsToHide.includes(id)) return false;

      const visibleWhen = fieldRules[id]?.visibleWhen;
      if (!visibleWhen) return true;

      const { field, key, value } = visibleWhen;
      const valorCampo = values?.[field];

      if (valorCampo === null || valorCampo === undefined) return false;

      if (key) {
        const valorCapoByKey = isRecord(valorCampo) ? valorCampo[key] : undefined;

        if (Array.isArray(value)) {
          return value.some((item) => item === valorCapoByKey);
        }

        return valorCapoByKey === value;
      }

      if (Array.isArray(value)) {
        return value.some((item) => item === valorCampo);
      }

      return valorCampo === value;
    },
    [inputsToHide, values],
  );

  const verificarSiGrupoEsVisible = React.useCallback((id: string): boolean => !groupsToHide.includes(id), [groupsToHide]);

  // ── Payload ───────────────────────────────────────────────────────────────

  const valoresSoloCodigos = React.useCallback(
    (payload?: string) => {
      return buildValoresSoloCodigos(values, fieldRules, payload);
    },
    [values],
  );

  return {
    values,
    setValues,
    onInput,
    valoresSoloCodigos,
    filtrarValoresPorPayload: (sourceValues: Record<string, unknown>, payload: string) => filtrarValoresPorPayload(sourceValues, fieldRules, payload),
    verificarSiEsLectura,
    verificarSiEsVisible,
    verificarSiGrupoEsVisible,
    verificarSiEsObligatorio,
    obtenerCatalogoById,
  };
}
