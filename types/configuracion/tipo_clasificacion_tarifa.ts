export const CODS_TIPOS_TRANSPORTE = {
  AEREO: 49,
  MARITIMO: 50,
  TERRESTRE: 51,
};

export const REL_TIPOS_CLASIFICACION_TARIFAS = [
  { label: "INTERNO", value: 0, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.MARITIMO },
  { label: "EXTERNO", value: 1, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.MARITIMO },
  { label: "INTERNO", value: 0, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.TERRESTRE },
  { label: "EXTERNO", value: 1, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.TERRESTRE },
  { label: "DUE AGENT", value: 2, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.AEREO },
  { label: "DUE CARRIER", value: 3, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.AEREO },
  { label: "FLETE", value: 4, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.AEREO },
  { label: "FLETE EXPRESS", value: 5, cod_tipo_padre: CODS_TIPOS_TRANSPORTE.AEREO },
];
