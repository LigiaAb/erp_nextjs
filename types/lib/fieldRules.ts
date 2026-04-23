export type VisibleWhenRule = {
  field: string;
  key?: string;
  value: unknown;
};

export type FieldAction = {
  id: string;
  icon?: string;
  label?: string;
};

export type FieldRule = {
  /** 🔴 OBLIGATORIO: nombre del campo que espera backend */
  cod: string;

  /** 🟡 OPCIONAL: catálogo que usa el select */
  catalogo?: string;

  /** 🟡 OPCIONAL: payload(s) a los que pertenece este campo */
  payload?: string[];

  /** 🟡 OPCIONAL: valor por defecto */
  default?: unknown;

  /** 🟡 OPCIONAL: campos que se limpian cuando este cambia */
  reset?: string[];

  /** 🟡 OPCIONAL: campos requeridos para poder usar este */
  require?: string | string[];

  /** 🟡 OPCIONAL: si el input es solo lectura */
  readonly?: boolean;

  /** 🟡 OPCIONAL: tipo especial del campo */
  tipo?: "datetime";

  /** 🟡 OPCIONAL: visibilidad condicional */
  visibleWhen?: VisibleWhenRule;

  /** 🟡 OPCIONAL: acciones extra del input */
  acciones?: FieldAction[];

  // /** 🟡 OPCIONAL: si el campo es obligatorio */
  obligatorio?: boolean;
};
