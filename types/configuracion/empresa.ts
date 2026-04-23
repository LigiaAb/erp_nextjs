export interface EmpresasRequest {
  status: number;
  message: string;
  length: number;
  data: Empresas[];
}

export interface Empresas {
  cod_empresa: number;
  nombre_emp: string;
  pais_emp: number;
  nit_emp: string;
  direccion_emp: string;
  logo_emp: null | string;
  fecha_ingreso: Date;
}
