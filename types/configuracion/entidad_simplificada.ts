export interface EntidadSimplificadaRequest {
  status: number;
  message: string;
  data: EntidadSimplificadaData;
}

export interface EntidadSimplificadaData {
  permite_crear: boolean;
  cod_tipo: number;
  data: EntidadSimplificada[];
}

export interface EntidadSimplificada {
  CODIGO_ENTIDAD: string;
  ENTIDAD_ID: number;
  ENTIDAD_NOMBRE: string;
  COD_TIPO: number;
  ENTIDAD_CLASIFICACION: string;
  NOMBRE_PAIS: string | null;
  ESTADO_DESC: string;
}
