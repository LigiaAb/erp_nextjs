export interface IncotermRequest {
  status: number;
  message: string;
  length: number;
  data: Incoterm[];
}

export interface Incoterm {
  incoterm_id: number;
  codigo: string;
  nombre: string;
  nombre_eng: string;
  descripcion: string;
}
