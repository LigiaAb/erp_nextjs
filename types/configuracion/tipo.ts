export interface TipoRequest {
  status: number;
  message: string;
  length: number;
  data: Tipo[];
}

export interface Tipo {
  cod_tipo: number;
  nom_tipo: string;
  tipo_tabla: string;
  cod_estado: number;
  estado_desc: string;
  cod_tipo_dato: null;
  nomenclatura: null;
}
