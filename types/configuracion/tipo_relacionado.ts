export interface TipoRelacionadoRequest {
  status: number;
  message: string;
  length: number;
  data: TipoRelacion[];
}

export interface TipoRelacion {
  cod_relacion_tipo: number;
  cod_tipo: number;
  tipo_desc: string;
  tipo_tabla: string;
  cod_tipo_padre: number;
  tipo_padre_desc: string;
  tipo_padre_tabla: string;
  fecha_inicio: Date;
  fecha_fin: null;
  cod_estado: number;
}
