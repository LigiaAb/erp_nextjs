"use client";

import { useCallback, useMemo } from "react";
import { CatalogCentroCosto, CatalogEmpresas, useFetchCentrosCosto, useFetchEmpresas } from "@/fetch/configuracion/accesos";
import {
  CatalogIncoterm,
  CatalogRubro,
  CatalogTipo,
  CatalogTipoRelacion,
  useFetchIncoterms,
  useFetchRubros,
  useFetchTipos,
  useFetchTiposRelacionado,
} from "@/fetch/configuracion/catalogos";
import { CatalogEntidad, CODS_TIPOS_ENTIDAD, fetchEntidadesPorCriterio, NOMBRES_TIPOS_ENTIDAD } from "@/fetch/entidades/entidadePorCriterio";
import { SearchOptionsResponse } from "@/fetch/fetchFactory";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type AgregarTodosConfig =
  | boolean
  | string[]
  | {
      default: unknown;
      catalogos: Record<string, boolean | unknown>;
    };

type CatalogosTarifa = {
  empresas: CatalogEmpresas[];
  centrosCosto: CatalogCentroCosto[];
  rubros: CatalogRubro[];
  tiposTransporte: CatalogTipo[];
  tiposServicio: CatalogTipoRelacion[];
  tiposClasificacion: CatalogTipoRelacion[];
  categoriasTransporte: CatalogTipo[];
  tiposCarga: CatalogTipo[];
  clasificacionesCarga: CatalogTipo[];
  incoterms: CatalogIncoterm[];
  tiposAplicacion: CatalogTipo[];
  tiposCalculo: CatalogTipo[];
  metodosCalculo: CatalogTipo[];
  tiposTarifa: CatalogTipo[];
};

type UseCatalogosTarifaOptions = {
  agregarTodos?: AgregarTodosConfig;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildTodosOption = (valueTodos: unknown) => ({
  label: "TODOS",
  value: valueTodos,
});

const getConfigAgregarTodos = (agregarTodos: AgregarTodosConfig | undefined, key: string): { aplicar: boolean; value: unknown } => {
  if (!agregarTodos) return { aplicar: false, value: null };

  if (Array.isArray(agregarTodos)) {
    return { aplicar: agregarTodos.includes(key), value: null };
  }

  if (typeof agregarTodos === "boolean") {
    return { aplicar: agregarTodos, value: null };
  }

  const catalogosConfig = agregarTodos.catalogos ?? {};
  const tieneConfigPropia = Object.prototype.hasOwnProperty.call(catalogosConfig, key);

  if (!tieneConfigPropia) return { aplicar: false, value: agregarTodos.default };

  const valorConfig = catalogosConfig[key];

  return {
    aplicar: valorConfig !== false,
    value: valorConfig === true ? agregarTodos.default : valorConfig,
  };
};

const agregarTodosACatalogo = <T extends { label?: string; value?: unknown }>(
  catalogo: T[],
  key: string,
  agregarTodos: AgregarTodosConfig | undefined,
): T[] => {
  if (!Array.isArray(catalogo)) return catalogo;

  const config = getConfigAgregarTodos(agregarTodos, key);
  if (!config.aplicar) return catalogo;

  const yaExiste = catalogo.some((i) => i?.label === "TODOS");
  if (yaExiste) return catalogo;

  return [buildTodosOption(config.value) as unknown as T, ...catalogo];
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

const useCatalogosTarifa = ({ agregarTodos }: UseCatalogosTarifaOptions = {}) => {
  // ── Fetchers estáticos ───────────────────────────────────────────────────────
  const empresasFetch = useFetchEmpresas();
  const centrosCostoFetch = useFetchCentrosCosto();
  const rubrosFetch = useFetchRubros();
  const tiposFetch = useFetchTipos();
  const tiposRelacionFetch = useFetchTiposRelacionado();
  const incotermsFetch = useFetchIncoterms();

  // ── Loading global ───────────────────────────────────────────────────────────
  const isLoading = useMemo(
    () =>
      empresasFetch.isLoading ||
      centrosCostoFetch.isLoading ||
      rubrosFetch.isLoading ||
      tiposFetch.isLoading ||
      tiposRelacionFetch.isLoading ||
      incotermsFetch.isLoading,
    [empresasFetch.isLoading, centrosCostoFetch.isLoading, rubrosFetch.isLoading, tiposFetch.isLoading, tiposRelacionFetch.isLoading, incotermsFetch.isLoading],
  );

  //  // ── Catálogos procesados ─────────────────────────────────────────────────────
  const catalogos = useMemo((): CatalogosTarifa => {
    const allTipos = (tiposFetch.data?.items ?? []) as CatalogTipo[];
    const allRelaciones = (tiposRelacionFetch.data?.items ?? []) as CatalogTipoRelacion[];

    const base: CatalogosTarifa = {
      empresas: (empresasFetch.data?.items ?? []) as CatalogEmpresas[],
      centrosCosto: (centrosCostoFetch.data?.items ?? []) as CatalogCentroCosto[],
      rubros: (rubrosFetch.data?.items ?? []) as CatalogRubro[],
      tiposTransporte: allTipos.filter((t) => t.tipo_tabla === "TRANSPORTE"),
      tiposServicio: allRelaciones.filter((t) => t.tipo_tabla === "SERVICIO" && t.tipo_padre_tabla === "TRANSPORTE"),
      tiposClasificacion: allRelaciones.filter((t) => t.tipo_tabla === "CLASIFICACION_SERVICIO" && t.tipo_padre_tabla === "TRANSPORTE"),
      categoriasTransporte: allTipos.filter((t) => t.tipo_tabla === "CATEGORIA_TRANSPORTE"),
      tiposCarga: allTipos.filter((t) => t.tipo_tabla === "TIPO_CARGA"),
      clasificacionesCarga: allTipos.filter((t) => t.tipo_tabla === "CLASIFICACION_CARGA"),
      incoterms: (incotermsFetch.data?.items ?? []) as CatalogIncoterm[],
      tiposAplicacion: allTipos.filter((t) => t.tipo_tabla === "APLICACION"),
      tiposCalculo: allTipos.filter((t) => t.tipo_tabla === "CALCULO"),
      metodosCalculo: allTipos.filter((t) => t.tipo_tabla === "METODO"),
      tiposTarifa: allTipos.filter((t) => t.tipo_tabla === "TARIFA"),
    };

    // Aplicar opción TODOS a los catálogos configurados
    return Object.fromEntries(
      Object.entries(base).map(([key, value]) => [key, agregarTodosACatalogo(value as { label?: string; value?: unknown }[], key, agregarTodos)]),
    ) as CatalogosTarifa;
  }, [empresasFetch.data, centrosCostoFetch.data, rubrosFetch.data, tiposFetch.data, tiposRelacionFetch.data, incotermsFetch.data, agregarTodos]);

  // ── Búsqueda async de proveedores ────────────────────────────────────────────
  const fetchOptionsProveedores = useCallback(async (searchTerm: string = ""): Promise<CatalogEntidad[]> => {
    try {
      const response: SearchOptionsResponse<CatalogEntidad> = await fetchEntidadesPorCriterio({
        ref_busqueda: searchTerm,
        tipo_busqueda: "NOMBRE",
        list_descripcion_tipo: [NOMBRES_TIPOS_ENTIDAD[CODS_TIPOS_ENTIDAD.PROVEEDOR], NOMBRES_TIPOS_ENTIDAD[CODS_TIPOS_ENTIDAD.PRE_PROVEEDOR]],
      });

      // Eliminar duplicados por value
      return response.items.reduce<CatalogEntidad[]>((acc, cur) => {
        if (acc.some((i) => i.value === cur.value)) return acc;
        return [...acc, cur];
      }, []);
    } catch (error) {
      console.error("Error al buscar proveedores:", error);
      return [];
    }
  }, []);

  // ── Retorno ──────────────────────────────────────────────────────────────────
  return useMemo(
    () => ({
      catalogos,
      isLoading,
      fetchOptionsProveedores,
    }),
    [catalogos, isLoading, fetchOptionsProveedores],
  );
};

export default useCatalogosTarifa;
