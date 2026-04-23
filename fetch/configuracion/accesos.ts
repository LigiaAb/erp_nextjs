"use client";

import { createCatalogFetcher, createCatalogHook, type CatalogBase } from "../fetchFactory";
import { Modulo, Menu, Categoria, CentroCosto, Empresas } from "@/types/configuracion";

export type CatalogModulo = Modulo & CatalogBase;
export type CatalogMenu = Menu & CatalogBase;
export type CatalogCategoria = Categoria & CatalogBase;
export type CatalogCentroCosto = CentroCosto & CatalogBase;
export type CatalogEmpresas = Empresas & CatalogBase;

const ENDPOINTS = {
  modulos: "/api/appweb/listamodulo",
  menus: "/api/appweb/lista-menu",
  categorias: "/api/appweb/lista-categoria",
  centrosCosto: "/api/appweb/listacentrocosto",
  empresas: "/api/appweb/listaempresas",
} as const;

function mapModulo(item: Modulo): CatalogModulo {
  const cod_modulo = item.cod_modulo ?? 0;
  const nom_modulo = item.nom_modulo ?? "";

  return {
    ...item,
    label: nom_modulo,
    value: cod_modulo,
  };
}

function mapMenu(item: Menu): CatalogMenu {
  const cod_menu = item.cod_menu ?? 0;
  const nom_menu = item.nom_menu ?? "";

  return {
    ...item,
    label: nom_menu,
    value: cod_menu,
  };
}

function mapCategoria(item: Categoria): CatalogCategoria {
  const value = item.cod_categoria ?? 0;
  const label = item.nom_cat ?? "";

  return {
    ...item,
    label,
    value,
  };
}

function mapCentroCosto(item: CentroCosto): CatalogCentroCosto {
  const value = item.cod_cc ?? 0;
  const label = item.nombre_cc ?? "";

  return {
    ...item,
    label,
    value,
  };
}

function mapEmpresas(item: Empresas): CatalogEmpresas {
  const value = item.cod_empresa ?? 0;
  const label = item.nombre_emp ?? "";

  return {
    ...item,
    label,
    value,
  };
}

export const fetchModulos = createCatalogFetcher(ENDPOINTS.modulos, mapModulo);
export const fetchMenus = createCatalogFetcher(ENDPOINTS.menus, mapMenu);
export const fetchCategorias = createCatalogFetcher(ENDPOINTS.categorias, mapCategoria);
export const fetchCentrosCosto = createCatalogFetcher(ENDPOINTS.centrosCosto, mapCentroCosto);
export const fetchEmpresas = createCatalogFetcher(ENDPOINTS.empresas, mapEmpresas);

export const useFetchModulos = createCatalogHook("modulos", fetchModulos);
export const useFetchMenus = createCatalogHook("menus", fetchMenus);
export const useFetchCategorias = createCatalogHook("categorias", fetchCategorias);
export const useFetchCentrosCosto = createCatalogHook("centrosCosto", fetchCentrosCosto);
export const useFetchEmpresas = createCatalogHook("empresas", fetchEmpresas);
