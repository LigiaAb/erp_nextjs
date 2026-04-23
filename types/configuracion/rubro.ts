export interface RubroRequest {
  status: number;
  message: string;
  length: number;
  data: Rubro[];
}

export interface Rubro {
  cod_rubro: number;
  nombre: string;
  cod_estado: number;
  fecha_inicio: Date;
  fecha_final: null;
}
