"use client";

/**
 * Helper externo que marca la sesión como expirada.
 *
 * Se usa cuando:
 * - el backend responde 401 o 403
 * - o cuando el backend responde un error de negocio
 *   que en tu sistema representa sesión vencida
 */
import { setSessionExpiredFlag } from "@/lib/api/apiFetch";

/**
 * Importamos TanStack Query con alias en los hooks principales
 * para dejar claro cuándo se está usando directamente la librería.
 *
 * También importamos los tipos necesarios para:
 * - queries
 * - mutations
 * - opciones tipadas de hooks
 * - resultados tipados
 */
import {
  useMutation as useTanstackMutation,
  useQuery as useTanstackQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";

/**
 * Valores simples permitidos en filtros de query string.
 *
 * Ejemplos válidos:
 * - "texto"
 * - 1
 * - true
 * - null
 * - undefined
 */
export type QueryFilterPrimitive = string | number | boolean | null | undefined;

/**
 * Valor permitido por cada filtro.
 *
 * Puede ser:
 * - un valor simple
 * - o una lista de valores simples
 *
 * Esto permite casos como:
 * {
 *   ref_busqueda: "abc",
 *   tipo_busqueda: "NOMBRE",
 *   list_descripcion_tipo: ["PROVEEDOR", "CLIENTE"]
 * }
 */
export type QueryFilterValue = QueryFilterPrimitive | QueryFilterPrimitive[];

/**
 * Objeto genérico de filtros para armar la URL.
 *
 * La idea es que cualquier fetcher pueda recibir un objeto simple
 * y buildUrl se encargue de transformarlo en query string.
 */
export type QueryFilters = Record<string, QueryFilterValue>;

/**
 * Estructura base esperada para catálogos simples.
 *
 * Se usa como contrato mínimo en opciones estilo select/autocomplete:
 * - label: texto visible
 * - value: valor interno
 */
export type CatalogBase = {
  label: string;
  value: string | number;
};

/**
 * Estructura genérica de envelope del backend.
 *
 * Aquí estás contemplando distintos formatos posibles que puede devolver la API:
 * - mensajes
 * - status
 * - success / cod_mensaje
 * - data
 * - metadata de paginación con múltiples nombres posibles
 *
 * Esto permite normalizar respuestas de endpoints que no siempre
 * siguen exactamente el mismo formato.
 */
export type ApiEnvelope<TData = unknown> = {
  status?: number;
  message?: string;
  mensaje?: string;
  length?: number;
  data?: TData;

  success?: boolean;
  cod_mensaje?: number;

  page?: number;
  pageNumber?: number;
  currentPage?: number;
  pagina?: number;
  paginaActual?: number;

  pageSize?: number;
  perPage?: number;
  per_page?: number;
  limit?: number;
  limite?: number;
  rowsPerPage?: number;

  total?: number;
  totalRows?: number;
  total_records?: number;
  totalRecords?: number;
  registros?: number;

  totalPages?: number;
  pages?: number;
  lastPage?: number;
  last_page?: number;
  paginas?: number;

  hasNext?: boolean;
  hasPrevious?: boolean;
  nextPage?: number | null;
  prevPage?: number | null;

  /**
   * Permite que el envelope acepte otras propiedades extras
   * sin romper el tipado.
   */
  [key: string]: unknown;
};

/**
 * Respuesta normalizada para consultas de catálogos.
 *
 * Esta es la forma final con la que quieres trabajar en frontend,
 * independientemente de cómo venga la respuesta original del backend.
 */
export type CatalogResponse<TItem> = {
  status?: number;
  message?: string;
  length?: number;
  items: TItem[];
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  hasPrevious?: boolean;
  nextPage?: number | null;
  prevPage?: number | null;

  /**
   * Payload original sin normalizar.
   * Útil para depuración o para casos especiales donde se necesite revisar
   * la respuesta real del backend.
   */
  raw?: unknown;
};

/**
 * Respuesta simple para búsquedas dinámicas de opciones.
 *
 * A diferencia de CatalogResponse, esta estructura es más ligera
 * porque normalmente solo necesitamos:
 * - items transformados
 * - y opcionalmente el raw
 *
 * Esto aplica mejor para búsquedas tipo autocomplete / search async.
 */
export type SearchOptionsResponse<TItem> = {
  items: TItem[];
  raw?: unknown;
};

/**
 * Estructura uniforme de error para frontend.
 *
 * La idea es que tus hooks y fetchers trabajen siempre con el mismo formato
 * de error, aunque el backend responda distinto según el endpoint.
 */
export type ApiError<TError = unknown> = {
  status: number;
  message: string;
  cod_mensaje?: number;
  data?: TError;
};

/**
 * Métodos HTTP permitidos para mutations generadas por factory.
 */
export type MutationMethod = "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * URL base de la API tomada desde variables de entorno públicas.
 *
 * Si no existe la variable, usa string vacío para no romper
 * la construcción de la URL.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/**
 * Convierte recursivamente todas las keys de un objeto a minúscula.
 *
 * Esto sirve para:
 * - normalizar respuestas del backend
 * - evitar depender de mayúsculas/minúsculas inconsistentes
 * - trabajar con nombres predecibles en frontend
 *
 * Soporta:
 * - arrays
 * - objetos anidados
 * - valores primitivos
 */
export const normalizeKeys = (obj: unknown): unknown => {
  if (Array.isArray(obj)) {
    return obj.map(normalizeKeys);
  }

  if (obj !== null && typeof obj === "object") {
    return Object.keys(obj as Record<string, unknown>).reduce((acc: Record<string, unknown>, key) => {
      acc[key.toLowerCase()] = normalizeKeys((obj as Record<string, unknown>)[key]);
      return acc;
    }, {});
  }

  return obj;
};

/**
 * Construye una URL con query params a partir de un path y un objeto de filtros.
 *
 * Soporta:
 * - valores simples: string, number, boolean
 * - null / undefined / "" -> se ignoran
 * - arrays -> se agregan como múltiples parámetros repetidos
 *
 * Ejemplo:
 * {
 *   ref_busqueda: "abc",
 *   list_descripcion_tipo: ["PROVEEDOR", "CLIENTE"]
 * }
 *
 * Resultado aproximado:
 * ?ref_busqueda=abc&list_descripcion_tipo=PROVEEDOR&list_descripcion_tipo=CLIENTE
 */
function buildUrl(path: string, filters?: QueryFilters) {
  const params = new URLSearchParams();

  if (filters) {
    for (const [key, value] of Object.entries(filters)) {
      // Ignorar valores vacíos simples
      if (value === undefined || value === null || value === "") continue;

      // Si el valor es una lista, agregar cada elemento como un parámetro repetido
      if (Array.isArray(value)) {
        for (const item of value) {
          if (item === undefined || item === null || item === "") continue;
          params.append(key, String(item));
        }
        continue;
      }

      // Si el valor es simple, usar set normal
      params.set(key, String(value));
    }
  }

  const qs = params.toString();
  const url = qs ? `${path}?${qs}` : path;

  return `${API_BASE_URL}${url}`;
}

/**
 * Intenta parsear el body de una respuesta como JSON sin lanzar error.
 *
 * Casos contemplados:
 * - body vacío -> retorna undefined
 * - body no es JSON válido -> retorna undefined
 * - body JSON válido -> retorna el objeto parseado
 *
 * Esto permite manejar respuestas vacías o no JSON sin romper el flujo.
 */
async function parseJsonSafe<T>(res: Response): Promise<T | undefined> {
  const text = await res.text();
  if (!text) return undefined;

  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

/**
 * Verifica si un valor es un objeto plano y no un array.
 *
 * Se usa como type guard para poder acceder a propiedades del objeto
 * de forma segura en TypeScript.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Valida errores de negocio devueltos por la API.
 *
 * Ojo:
 * aquí no se evalúan errores HTTP (401, 500, etc.),
 * sino respuestas "exitosas" a nivel HTTP que internamente traen:
 * - success: false
 * - cod_mensaje
 * - mensaje / message
 *
 * También detecta códigos de sesión expirada y dispara el flag correspondiente.
 */
async function validateApiBusinessError<TError = unknown>(data: unknown): Promise<void> {
  // Si no es un objeto, no hay nada que validar
  if (!isRecord(data)) return;

  // Algunos endpoints anidan la data de negocio dentro de data.data
  const nestedData = isRecord(data.data) ? data.data : undefined;

  // Verifica si existe alguna propiedad success en el nivel principal o anidado
  const hasSuccess = "success" in data || (!!nestedData && "success" in nestedData);

  // Si la respuesta no usa success, no se interpreta como error de negocio aquí
  if (!hasSuccess) return;

  // Toma success del nivel principal o del anidado, y si no existe, asume true
  const success =
    (typeof data.success === "boolean" ? data.success : undefined) ?? (typeof nestedData?.success === "boolean" ? nestedData.success : undefined) ?? true;

  // Si success es true, no hay error de negocio
  if (success) return;

  // Obtiene el código de mensaje de negocio si existe
  const cod =
    (typeof data.cod_mensaje === "number" ? data.cod_mensaje : undefined) ??
    (typeof nestedData?.cod_mensaje === "number" ? nestedData.cod_mensaje : undefined) ??
    400;

  // Obtiene el mensaje más útil posible
  const msg =
    (typeof data.mensaje === "string" ? data.mensaje : undefined) ??
    (typeof data.message === "string" ? data.message : undefined) ??
    (typeof nestedData?.mensaje === "string" ? nestedData.mensaje : undefined) ??
    (typeof nestedData?.message === "string" ? nestedData.message : undefined) ??
    "Error inesperado";

  // Códigos que en tu sistema representan sesión vencida
  const codigosSesionExpirada = [1001, 1003];

  const codigo =
    (typeof data.cod_mensaje === "number" ? data.cod_mensaje : undefined) ?? (typeof nestedData?.cod_mensaje === "number" ? nestedData.cod_mensaje : undefined);

  // Si el backend indica sesión vencida, se marca el flag global
  if (codigo === 1062 || (codigo !== undefined && codigosSesionExpirada.includes(codigo))) {
    await setSessionExpiredFlag();
  }

  // Se lanza error normalizado para que lo manejen los hooks/consumidores
  throw {
    status: cod,
    message: String(msg),
    cod_mensaje: codigo,
    data: undefined,
  } satisfies ApiError<TError>;
}

/**
 * Hace un request HTTP y devuelve la respuesta normalizada como JSON.
 *
 * Esta función es la base de tus requests.
 *
 * Responsabilidades:
 * 1. ejecutar fetch
 * 2. agregar headers comunes
 * 3. intentar parsear JSON de respuesta
 * 4. detectar sesión expirada por status HTTP
 * 5. normalizar errores HTTP
 * 6. normalizar keys a minúscula
 * 7. validar errores de negocio
 */
async function requestJson<TResponse, TError = unknown>(url: string, init: RequestInit): Promise<TResponse> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      Authorization: localStorage.getItem("token") ?? "",
      version_app: localStorage.getItem("version_app") ?? "",
      ...(init.headers ?? {}),
    },
  });

  // Intenta parsear el body sin romper si viene vacío o inválido
  const rawData = await parseJsonSafe<unknown>(res);

  // Si el backend responde 401/403, se marca sesión expirada
  if (res.status === 401 || res.status === 403) {
    await setSessionExpiredFlag();
  }

  // Si la respuesta HTTP no fue exitosa, se arma y lanza un error uniforme
  if (!res.ok) {
    const errorPayload = isRecord(rawData) ? rawData : undefined;

    throw {
      status: res.status,
      message:
        (typeof errorPayload?.mensaje === "string" ? errorPayload.mensaje : undefined) ??
        (typeof errorPayload?.message === "string" ? errorPayload.message : undefined) ??
        (typeof errorPayload?.error === "string" ? errorPayload.error : undefined) ??
        `Request error (${res.status})`,
      cod_mensaje: typeof errorPayload?.cod_mensaje === "number" ? errorPayload.cod_mensaje : undefined,
      data: errorPayload as TError | undefined,
    } satisfies ApiError<TError>;
  }

  // Si no vino body, retorna undefined tipado como la respuesta esperada
  if (rawData === undefined) {
    return undefined as TResponse;
  }

  // Normaliza todas las keys a minúscula
  const data = normalizeKeys(rawData);

  // Valida posibles errores de negocio del backend
  await validateApiBusinessError<TError>(data);

  // Retorna la respuesta ya normalizada
  return data as TResponse;
}

/**
 * Atajo para requests GET JSON.
 *
 * Usa requestJson internamente para no duplicar lógica.
 */
async function getJson<T, TError = unknown>(url: string): Promise<T> {
  return requestJson<T, TError>(url, {
    method: "GET",
  });
}

/**
 * Intenta convertir un valor desconocido a número.
 *
 * Casos válidos:
 * - number finito
 * - string numérico no vacío
 *
 * Si no puede convertirse, retorna undefined.
 */
function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/**
 * Retorna el primer valor definido de una lista.
 *
 * Se usa para soportar múltiples nombres posibles
 * para la misma metadata del backend.
 */
function firstDefined<T>(...values: (T | undefined)[]): T | undefined {
  for (const value of values) {
    if (value !== undefined) return value;
  }
  return undefined;
}

/**
 * Normaliza metadata de paginación desde diferentes formatos de backend.
 *
 * Tu backend puede mandar la paginación con distintos nombres:
 * - page / pageNumber / pagina / paginaActual
 * - pageSize / perPage / limit / etc.
 * - total / totalRows / registros / etc.
 *
 * Esta función unifica todo eso en una sola estructura.
 */
function normalizePaginationMeta(
  payload: ApiEnvelope<unknown>,
  itemCount: number,
): Pick<CatalogResponse<unknown>, "page" | "pageSize" | "total" | "totalPages" | "hasNext" | "hasPrevious" | "nextPage" | "prevPage"> {
  const page = firstDefined(
    toNumber(payload.page),
    toNumber(payload.pageNumber),
    toNumber(payload.currentPage),
    toNumber(payload.pagina),
    toNumber(payload.paginaActual),
  );

  const pageSize = firstDefined(
    toNumber(payload.pageSize),
    toNumber(payload.perPage),
    toNumber(payload.per_page),
    toNumber(payload.limit),
    toNumber(payload.limite),
    toNumber(payload.rowsPerPage),
  );

  const total = firstDefined(
    toNumber(payload.total),
    toNumber(payload.totalRows),
    toNumber(payload.total_records),
    toNumber(payload.totalRecords),
    toNumber(payload.registros),
    toNumber(payload.length),
  );

  const totalPages =
    firstDefined(toNumber(payload.totalPages), toNumber(payload.pages), toNumber(payload.lastPage), toNumber(payload.last_page), toNumber(payload.paginas)) ??
    (pageSize && total ? Math.ceil(total / pageSize) : undefined);

  const nextPage = toNumber(payload.nextPage) ?? (page && totalPages && page < totalPages ? page + 1 : undefined);

  const prevPage = toNumber(payload.prevPage) ?? (page && page > 1 ? page - 1 : undefined);

  const hasNext = typeof payload.hasNext === "boolean" ? payload.hasNext : nextPage !== undefined && nextPage !== null;

  const hasPrevious = typeof payload.hasPrevious === "boolean" ? payload.hasPrevious : prevPage !== undefined && prevPage !== null;

  return {
    page,
    pageSize,
    total: total ?? itemCount,
    totalPages,
    hasNext,
    hasPrevious,
    nextPage: nextPage ?? null,
    prevPage: prevPage ?? null,
  };
}

/**
 * Extrae la lista de items desde distintos formatos de respuesta del backend.
 *
 * Casos soportados:
 * 1. array directo
 * 2. envelope con data como array
 * 3. envelope con data anidada en data.data
 *
 * Ejemplos:
 *
 * Caso 1:
 * [
 *   { ... },
 *   { ... }
 * ]
 *
 * Caso 2:
 * {
 *   status: 200,
 *   message: "SUCCESS",
 *   data: [
 *     { ... },
 *     { ... }
 *   ]
 * }
 *
 * Caso 3:
 * {
 *   status: 200,
 *   message: "SUCCESS",
 *   data: {
 *     permite_crear: true,
 *     cod_tipo: 5,
 *     data: [
 *       { ... },
 *       { ... }
 *     ]
 *   }
 * }
 */
function extractItemsFromPayload<T>(payload: T[] | ApiEnvelope<T[]>): T[] {
  // Caso 1: array directo
  if (Array.isArray(payload)) {
    return payload;
  }

  // Caso 2: payload.data ya es array
  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  // Caso 3: payload.data es objeto y payload.data.data es array
  if (isRecord(payload.data) && Array.isArray(payload.data.data)) {
    return payload.data.data as T[];
  }

  // Si no coincide con ningún formato esperado, retorna arreglo vacío
  return [];
}

/**
 * Normaliza la respuesta de catálogos.
 *
 * Soporta tres formatos de entrada:
 * 1. array directo
 * 2. envelope con data como array
 * 3. envelope con data anidada en data.data
 *
 * Además:
 * - transforma cada item con mapItem
 * - agrega metadata normalizada
 * - guarda el payload raw
 */
function normalizeApiResponse<TSource, TMapped>(payload: TSource[] | ApiEnvelope<TSource[]>, mapItem: (item: TSource) => TMapped): CatalogResponse<TMapped> {
  // Caso 1: el backend devuelve directamente un array
  if (Array.isArray(payload)) {
    return {
      items: payload.map(mapItem),
      length: payload.length,
      total: payload.length,
      raw: payload,
    };
  }

  // Para envelopes, extraer items desde los formatos soportados
  const sourceItems = extractItemsFromPayload(payload);
  const items = sourceItems.map(mapItem);
  const pagination = normalizePaginationMeta(payload, items.length);

  return {
    status: toNumber(payload.status),
    message: (typeof payload.mensaje === "string" ? payload.mensaje : undefined) ?? (typeof payload.message === "string" ? payload.message : undefined),
    length: toNumber(payload.length) ?? items.length,
    items,
    ...pagination,
    raw: payload,
  };
}

/**
 * Normaliza la respuesta de mutations.
 *
 * Casos:
 * - si el payload no es objeto, retorna tal cual
 * - si tiene propiedad data, intenta devolver payload.data
 * - si no, devuelve el payload completo
 *
 * Esto evita que cada mutation tenga que saber si el backend responde:
 * - directamente el objeto
 * - o un envelope con data
 */
function normalizeMutationResponse<TResponse>(payload: TResponse | ApiEnvelope<TResponse>): TResponse {
  if (!isRecord(payload)) return payload as TResponse;

  if ("data" in payload) {
    return (payload.data as TResponse) ?? (payload as TResponse);
  }

  return payload as TResponse;
}

/**
 * Factory para crear fetchers de catálogos.
 *
 * Recibe:
 * - endpoint
 * - función mapItem para transformar cada item del backend
 *
 * Retorna:
 * - una función async que consulta el endpoint
 * - aplica filtros opcionales
 * - y devuelve CatalogResponse normalizado
 */
export function createCatalogFetcher<TSource, TMapped>(endpoint: string, mapItem: (item: TSource) => TMapped) {
  return async function fetchCatalog(filters?: QueryFilters): Promise<CatalogResponse<TMapped>> {
    const url = buildUrl(endpoint, filters);
    const payload = await getJson<TSource[] | ApiEnvelope<TSource[]>>(url);
    return normalizeApiResponse(payload, mapItem);
  };
}

/**
 * Crea un fetcher genérico para búsquedas dinámicas de opciones.
 *
 * Se usa cuando un endpoint devuelve resultados según filtros variables,
 * por ejemplo:
 * - texto escrito por el usuario
 * - tipo de búsqueda
 * - listas de tipos
 *
 * Esta función:
 * 1. arma la URL con filtros
 * 2. hace el GET
 * 3. acepta respuesta en formato:
 *    - array directo
 *    - envelope con data como array
 *    - envelope con data anidada en data.data
 * 4. transforma cada item con mapItem
 */
export function createSearchOptionsFetcher<TSource, TMapped>(endpoint: string, mapItem: (item: TSource) => TMapped) {
  return async function fetchSearchOptions(filters?: QueryFilters): Promise<SearchOptionsResponse<TMapped>> {
    const url = buildUrl(endpoint, filters);

    const payload = await getJson<TSource[] | ApiEnvelope<TSource[]>>(url);

    const sourceItems = extractItemsFromPayload(payload);

    return {
      items: sourceItems.map(mapItem),
      raw: payload,
    };
  };
}

/**
 * Factory para crear hooks useQuery de catálogos.
 *
 * Recibe:
 * - keyBase: base del queryKey
 * - fetcher: función que consulta el catálogo
 *
 * Retorna:
 * - un hook listo para usar con TanStack Query
 */
export function createCatalogHook<TItem>(keyBase: string, fetcher: (filters?: QueryFilters) => Promise<CatalogResponse<TItem>>) {
  return function useCatalog(
    filters?: QueryFilters,
    options?: Omit<UseQueryOptions<CatalogResponse<TItem>, ApiError, CatalogResponse<TItem>, readonly [string, QueryFilters]>, "queryKey" | "queryFn">,
  ): UseQueryResult<CatalogResponse<TItem>, ApiError> {
    return useTanstackQuery<CatalogResponse<TItem>, ApiError, CatalogResponse<TItem>, readonly [string, QueryFilters]>({
      /**
       * La query queda identificada por:
       * - la key base
       * - los filtros actuales
       *
       * Si los filtros cambian, TanStack Query considera que es otra consulta.
       */
      queryKey: [keyBase, filters ?? {}] as const,

      /**
       * Ejecuta el fetcher real del catálogo.
       */
      queryFn: () => fetcher(filters),

      /**
       * Tiempo durante el cual la data se considera fresca.
       */
      staleTime: 1000 * 60 * 10,

      /**
       * Evita refetch automático solo por volver a enfocar la ventana.
       */
      refetchOnWindowFocus: false,

      /**
       * Mantiene la data previa mientras llega la nueva.
       * Útil para cambios de filtros sin "parpadeo" brusco.
       */
      placeholderData: (previousData) => previousData,

      ...options,

      /**
       * Metadata extra útil para debugging o herramientas de observabilidad.
       */
      meta: {
        feature: "catalogos",
        entity: keyBase,
        action: "list",
        logName: `Consultar ${keyBase}`,
        ...(options?.meta ?? {}),
      },
    });
  };
}

/**
 * Crea un hook de TanStack Query para búsquedas dinámicas de opciones.
 *
 * Se basa en un fetcher previamente creado con createSearchOptionsFetcher.
 *
 * El queryKey incluye:
 * - una base identificadora (keyBase)
 * - los filtros actuales
 *
 * Esto permite que TanStack Query:
 * - haga cache por combinación de filtros
 * - vuelva a consultar cuando cambian los filtros
 */
export function createSearchOptionsHook<TItem>(keyBase: string, fetcher: (filters?: QueryFilters) => Promise<SearchOptionsResponse<TItem>>) {
  return function useSearchOptions(
    filters?: QueryFilters,
    options?: Omit<
      UseQueryOptions<SearchOptionsResponse<TItem>, ApiError, SearchOptionsResponse<TItem>, readonly [string, QueryFilters]>,
      "queryKey" | "queryFn"
    >,
  ): UseQueryResult<SearchOptionsResponse<TItem>, ApiError> {
    return useTanstackQuery<SearchOptionsResponse<TItem>, ApiError, SearchOptionsResponse<TItem>, readonly [string, QueryFilters]>({
      /**
       * La key incluye el nombre base y los filtros actuales.
       * Si cambia cualquier filtro, TanStack Query lo considera otra consulta.
       */
      queryKey: [keyBase, filters ?? {}] as const,

      /**
       * Ejecuta el fetcher usando los filtros recibidos.
       */
      queryFn: () => fetcher(filters),

      /**
       * Mantiene la data previa mientras llega la nueva,
       * útil para autocompletes o búsquedas por texto.
       */
      placeholderData: (previousData) => previousData,

      /**
       * Tiempo base de frescura.
       * Puedes ajustarlo desde options si un caso puntual lo requiere.
       */
      staleTime: 1000 * 60 * 5,

      /**
       * Evita refetch automático al volver a enfocar la ventana.
       * Mantiene un comportamiento parecido al resto de tus factories.
       */
      refetchOnWindowFocus: false,

      ...options,

      /**
       * Metadata opcional para debugging o herramientas de monitoreo.
       */
      meta: {
        feature: "search-options",
        entity: keyBase,
        action: "list",
        logName: `Consultar opciones ${keyBase}`,
        ...(options?.meta ?? {}),
      },
    });
  };
}

/**
 * Factory para crear fetchers de mutation.
 *
 * Recibe:
 * - endpoint
 * - método HTTP
 *
 * Retorna:
 * - una función async que permite enviar body y filtros opcionales
 * - y devuelve la respuesta normalizada
 */
export function createCatalogMutationFetcher<TBody = unknown, TResponse = unknown>(endpoint: string, method: MutationMethod = "POST") {
  return async function mutateCatalog(body?: TBody, filters?: QueryFilters): Promise<TResponse> {
    const url = buildUrl(endpoint, filters);

    const payload = await requestJson<TResponse | ApiEnvelope<TResponse>>(url, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    return normalizeMutationResponse(payload);
  };
}

/**
 * Factory para crear hooks useMutation reutilizables.
 *
 * Recibe:
 * - keyBase: nombre base de la entidad o recurso
 * - mutationFn: función async que ejecuta la mutation real
 *
 * Retorna:
 * - un hook useMutation tipado y reutilizable
 */
export function createCatalogMutationHook<TBody = unknown, TResponse = unknown, TContext = unknown>(
  keyBase: string,
  mutationFn: (body?: TBody, filters?: QueryFilters) => Promise<TResponse>,
) {
  return function useCatalogMutation(
    options?: Omit<UseMutationOptions<TResponse, ApiError, { body?: TBody; filters?: QueryFilters }, TContext>, "mutationFn">,
  ): UseMutationResult<TResponse, ApiError, { body?: TBody; filters?: QueryFilters }, TContext> {
    return useTanstackMutation<TResponse, ApiError, { body?: TBody; filters?: QueryFilters }, TContext>({
      /**
       * TanStack Mutation recibirá un objeto con:
       * - body opcional
       * - filters opcionales
       *
       * Y lo delega a la función real de mutation.
       */
      mutationFn: ({ body, filters }) => mutationFn(body, filters),

      ...options,

      /**
       * Metadata adicional para debugging / observabilidad.
       */
      meta: {
        feature: "catalogos",
        entity: keyBase,
        action: "mutation",
        logName: `Mutar ${keyBase}`,
        ...(options?.meta ?? {}),
      },
    });
  };
}
