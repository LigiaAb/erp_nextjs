import type { MouseEvent, ReactNode } from "react";

export type RowId = string | number;

export type EditableColumnType = "text" | "number" | "checkbox" | "select" | "date" | "custom";

export type ColumnAlign = "left" | "center" | "right";

export type SelectOption = {
  label: string;
  value: string | number;
};

export type LabeledValue = {
  label: ReactNode;
};

export type BuiltInRowAction = "open" | "edit" | "delete" | "copy" | "download" | "mail" | "auth" | "pdf" | "print" | "kanban";

export type RowActionClickContext = {
  newTab: boolean;
  event: MouseEvent<HTMLButtonElement>;
};

export type ActionDefinition = {
  visible: boolean;
  title: string;
  icon: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export type ActionVisibility<TData extends object> = boolean | ((row: TData) => boolean);

export type TableActionsConfig<TData extends object> = {
  showFrontColumn?: boolean;
  showBackColumn?: boolean;
  frontOrder?: BuiltInRowAction[];
  backOrder?: BuiltInRowAction[];
  enabled?: Partial<Record<BuiltInRowAction, ActionVisibility<TData>>>;
  tooltips?: Partial<Record<BuiltInRowAction, string>>;
};

export type CustomComponentMetadata = {
  module: string;
  fileName?: string;
  route?: string;
  cod_usuario?: string;
};

export type EditableColumn<TData extends object> = {
  id: keyof TData & string;
  header: string;
  type?: EditableColumnType;
  align?: ColumnAlign;
  editable?: boolean | ((row: TData) => boolean);
  required?: boolean | ((row: TData) => boolean);
  width?: number | string;
  placeholder?: string;
  options?: SelectOption[] | ((row: TData) => SelectOption[]);
  className?: string;
  textClassName?: string | ((value: TData[keyof TData], row: TData) => string | undefined);
  format?: (value: TData[keyof TData], row: TData) => ReactNode;
  cell?: (row: TData) => ReactNode;
  editor?: (args: { value: unknown; row: TData; column: EditableColumn<TData>; onChange: (value: unknown) => void }) => ReactNode;
};

export type EditableTableProps<TData extends object> = {
  metadata: CustomComponentMetadata;
  title?: string;
  data: TData[];
  columns: EditableColumn<TData>[];
  getRowId: (row: TData) => RowId;

  searchable?: boolean;
  searchPlaceholder?: string;
  compact?: boolean;

  actions?: TableActionsConfig<TData>;

  headerActions?: React.ReactNode;

  /**
   * Nueva fila arriba de la tabla.
   * Solo aparece si allowCreate = true.
   */
  allowCreate?: boolean;

  /**
   * Objeto base para la nueva fila.
   * Recomendado para inicializar defaults.
   */
  createRowDefault?: Partial<TData>;

  /**
   * Mantener inputs después de crear.
   */
  keepCreateValues?: boolean;

  /**
   * Texto del botón crear.
   */
  createButtonTitle?: string;

  /**
   * Texto del botón limpiar nueva fila.
   */
  clearCreateButtonTitle?: string;

  onCreate?: (newRow: TData) => void | Promise<void>;
  onSave?: (rowId: RowId, updatedRow: TData) => void | Promise<void>;
  onDelete?: (rowId: RowId, row: TData) => void | Promise<void>;
  onEditStart?: (rowId: RowId, row: TData) => void;
  onRowClick?: (rowId: RowId, row: TData) => void;

  onOpen?: (rowId: RowId, row: TData, ctx: RowActionClickContext) => void | Promise<void>;

  onCopy?: (rowId: RowId, row: TData) => void | Promise<void>;
  onDownload?: (rowId: RowId, row: TData) => void | Promise<void>;
  onMail?: (rowId: RowId, row: TData) => void | Promise<void>;
  onAuth?: (rowId: RowId, row: TData) => void | Promise<void>;
  onPdf?: (rowId: RowId, row: TData) => void | Promise<void>;
  onPrint?: (rowId: RowId, row: TData) => void | Promise<void>;
  onKanban?: (rowId: RowId, row: TData) => void | Promise<void>;
};
