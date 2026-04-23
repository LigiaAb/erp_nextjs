"use client";

import { createSearchOptionsFetcher, createSearchOptionsHook, type CatalogBase } from "../fetchFactory";

import { EntidadPorCriterio, EntidadSimplificada } from "@/types/configuracion";

/**
 * Códigos internos de tipos de entidad.
 *
 * Esto permite no dejar números mágicos repartidos en el código.
 * Si mañana cambia un código, solo se ajusta aquí.
 */
export const CODS_TIPOS_ENTIDAD = {
  PRE_CLIENTE: 5,
  CLIENTE: 3,
  PROVEEDOR: 2,
  PRE_PROVEEDOR: 15,
} as const;

/**
 * Nombres descriptivos por tipo de entidad.
 *
 * Estos nombres son los que normalmente espera el backend
 * en el parámetro list_descripcion_tipo.
 *
 * Ojo:
 * aquí debes dejar exactamente los textos que tu backend espera.
 */
export const NOMBRES_TIPOS_ENTIDAD: Record<number, string> = {
  [CODS_TIPOS_ENTIDAD.PRE_CLIENTE]: "PRE-CLIENTE",
  [CODS_TIPOS_ENTIDAD.CLIENTE]: "CLIENTE",
  [CODS_TIPOS_ENTIDAD.PROVEEDOR]: "PROVEEDOR",
  [CODS_TIPOS_ENTIDAD.PRE_PROVEEDOR]: "PRE-PROVEEDOR",
};

/**
 * Tipo final que usará el frontend para opciones de entidades.
 *
 * Mezcla:
 * - la estructura original de Entidad
 * - más label y value para selects/autocomplete
 */
export type CatalogEntidad = EntidadPorCriterio & CatalogBase;

/**
 * Endpoint de búsqueda de entidades por criterio.
 *
 * Este endpoint no es un catálogo fijo,
 * sino una búsqueda dinámica según filtros enviados.
 */
const ENDPOINTS = {
  busqueda_entidad_x_criterio: "/api/appweb/busqueda-entidad-x-criterio",
  entidad_simplificada: "/api/appweb/lista-entidad-simplificada",
} as const;

/**
 * Convierte una entidad del backend en una opción usable por frontend.
 *
 * Aquí decides:
 * - qué campo será el value
 * - qué campo será el label
 *
 * En este caso:
 * - value = entidad_id
 * - label = entidad_nombre
 */
function mapEntidad(item: EntidadPorCriterio): CatalogEntidad {
  const value = item.entidad_id ?? 0;
  const label = item.entidad_nombre ?? "";

  return { ...item, label, value };
}

/**
 * Fetcher base de búsqueda de entidades.
 *
 * Este fetcher:
 * - recibe filtros dinámicos
 * - consulta el endpoint
 * - transforma cada resultado con mapEntidad
 *
 * Ojo:
 * aquí todavía no estamos amarrando el caso a proveedor, cliente, etc.
 * Solo estamos creando el fetcher general del recurso "entidades".
 */
export const fetchEntidadesPorCriterio = createSearchOptionsFetcher(ENDPOINTS.busqueda_entidad_x_criterio, mapEntidad);

/**
 * Hook general para consultar entidades con filtros dinámicos.
 *
 * Este hook sirve para cualquier búsqueda de entidades,
 * siempre que le mandes los filtros correctos.
 *
 * Ejemplos de filtros posibles:
 * {
 *   ref_busqueda: "abc",
 *   tipo_busqueda: "NOMBRE",
 *   list_descripcion_tipo: ["PROVEEDOR"]
 * }
 */
export const useFetchEntidadesPorCriterio = createSearchOptionsHook("busqueda_entidad_x_criterio", fetchEntidadesPorCriterio);
