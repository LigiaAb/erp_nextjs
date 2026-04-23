export interface EntidadPorCriterioRequest {
  status: number;
  message: string;
  data: EntidadPorCriterioData;
}

export interface EntidadPorCriterioData {
  success: boolean;
  data: EntidadPorCriterio[];
  list_cod_tipo: number[];
}

export interface EntidadPorCriterio {
  codigo_entidad: string;
  entidad_id: number;
  entidadnombre_nombre: string;
  cod_tipo: number;
  entidad_nombre: string;
}
