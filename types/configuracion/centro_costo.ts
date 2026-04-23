export interface CentroCostoRequest {
  status: number;
  message: string;
  length: number;
  data: CentroCosto[];
}

export interface CentroCosto {
  cod_cc: number;
  cod_empresa_cc: number;
  nombre_cc: string;
  nombre_emp: string;
  cod_cropa: null | string;
}
