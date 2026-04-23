"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type ColumnSizingState,
  type ColumnSizingInfoState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Copy,
  Download,
  Eye,
  FileText,
  LayoutGrid,
  Mail,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Shield,
  Trash2,
  X,
} from "lucide-react";

import type {
  ActionVisibility,
  BuiltInRowAction,
  ColumnAlign,
  EditableColumn,
  EditableTableProps,
  LabeledValue,
  RowActionClickContext,
  RowId,
  SelectOption,
  TableActionsConfig,
} from "@/types/components/table";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AutoCompleteField from "@/components/custom/form/autoCompleteField";
import { logButtonClick } from "@/lib/logs/logButtonClick";

/* ============================================================================
 * Helpers
 * ========================================================================== */

function isObjectValue(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasLabel(value: unknown): value is LabeledValue {
  return isObjectValue(value) && "label" in value;
}

function reactNodeToSearchText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToSearchText).join(" ");
  return "";
}

function isEditable<TData extends object>(column: EditableColumn<TData>, row: TData) {
  if (typeof column.editable === "function") return column.editable(row);
  return column.editable ?? false;
}

function isRequired<TData extends object>(column: EditableColumn<TData>, row: TData) {
  if (typeof column.required === "function") return column.required(row);
  return column.required ?? false;
}

function getOptions<TData extends object>(column: EditableColumn<TData>, row: TData): SelectOption[] {
  if (typeof column.options === "function") return column.options(row);
  return column.options ?? [];
}

function normalizeDateInput(value: unknown) {
  if (!value) return "";

  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  return "";
}

function defaultDisplayValue<TData extends object>(
  value: TData[keyof TData],
  row: TData,
  column: EditableColumn<TData>,
  options?: SelectOption[],
): React.ReactNode {
  if (column.format) return column.format(value, row);

  if (column.type === "checkbox") return value ? "Sí" : "No";

  if (column.type === "select") {
    const found = options?.find((option) => String(option.value) === String(value));
    return found?.label ?? "";
  }

  if (column.type === "date") return normalizeDateInput(value);

  if (value === null || value === undefined) return "";

  if (isObjectValue(value)) {
    if (hasLabel(value)) return value.label;
    return <span className="text-destructive">Objeto sin label ni format</span>;
  }

  return String(value);
}

function getSearchableText<TData extends object>(value: TData[keyof TData], row: TData, column: EditableColumn<TData>): string {
  if (column.format) {
    return reactNodeToSearchText(column.format(value, row)).toLowerCase();
  }

  if (value === null || value === undefined) return "";

  if (isObjectValue(value)) {
    if (hasLabel(value)) return reactNodeToSearchText(value.label).toLowerCase();
    return "";
  }

  return String(value).toLowerCase();
}

function validateRow<TData extends object>(row: TData, columns: EditableColumn<TData>[]) {
  const errors: string[] = [];

  for (const column of columns) {
    if (!isRequired(column, row)) continue;

    const value = row[column.id];
    const empty = value === null || value === undefined || value === "" || (typeof value === "number" && Number.isNaN(value));

    if (empty) errors.push(column.header);
  }

  return errors;
}

function getColumnAlign<TData extends object>(column: EditableColumn<TData> | undefined): ColumnAlign {
  if (!column?.align) {
    if (column?.type === "number") return "right";
    if (column?.type === "checkbox") return "center";
    return "left";
  }
  return column.align;
}

function getAlignClass(align: ColumnAlign) {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function getTextClassName<TData extends object>(column: EditableColumn<TData>, value: TData[keyof TData], row: TData) {
  if (typeof column.textClassName === "function") {
    return column.textClassName(value, row);
  }
  return column.textClassName;
}

const DEFAULT_FRONT_ACTION_ORDER: BuiltInRowAction[] = ["open"];

const DEFAULT_BACK_ACTION_ORDER: BuiltInRowAction[] = ["kanban", "pdf", "print", "download", "mail", "auth", "copy", "edit", "delete"];

const DEFAULT_TOOLTIPS: Record<BuiltInRowAction, string> = {
  open: "Abrir (Ctrl/Cmd + click = nueva pestaña)",
  edit: "Editar",
  delete: "Eliminar",
  copy: "Copiar",
  download: "Descargar",
  mail: "Enviar correo",
  auth: "Autorizar",
  pdf: "PDF",
  print: "Imprimir",
  kanban: "Kanban",
};

const ROW_ACTION_LABELS: Record<BuiltInRowAction, string> = {
  open: "Abrir",
  edit: "Editar",
  delete: "Eliminar",
  copy: "Copiar",
  download: "Descargar",
  mail: "Enviar correo",
  auth: "Autorizar",
  pdf: "PDF",
  print: "Imprimir",
  kanban: "Kanban",
};

function resolveActionVisibility<TData extends object>(rule: ActionVisibility<TData> | undefined, row: TData, fallback: boolean) {
  if (typeof rule === "function") return rule(row);
  if (typeof rule === "boolean") return rule;
  return fallback;
}

/* ============================================================================
 * Cell editor
 * ========================================================================== */

function CellEditor<TData extends object>(props: {
  row: TData;
  column: EditableColumn<TData>;
  value: unknown;
  compact: boolean;
  onChange: (value: unknown) => void;
}) {
  const { row, column, value, compact, onChange } = props;

  if (column.editor) {
    return column.editor({ value, row, column, onChange });
  }

  const commonClassName = compact ? "h-8 text-xs" : "h-9 text-sm";

  switch (column.type) {
    case "number":
      return (
        <Input
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={column.placeholder}
          className={commonClassName}
          onChange={(e) => {
            const raw = e.target.value;
            onChange(raw === "" ? "" : Number(raw));
          }}
        />
      );

    case "checkbox":
      return (
        <div className="flex items-center justify-center">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(Boolean(checked))} />
        </div>
      );

    case "select": {
      const options = getOptions(column, row);
      const selectedOption = options.find((option) => String(option.value) === String(value)) ?? null;

      return (
        <AutoCompleteField<SelectOption>
          id={`autocomplete-${String(column.id)}`}
          label=""
          options={options}
          value={selectedOption}
          onChange={(selected) => {
            onChange(selected?.value ?? "");
          }}
          getOptionValue={(option) => option.value}
          getOptionLabel={(option) => option.label}
          placeholder={column.placeholder ?? "Seleccionar..."}
          fieldProps={{ className: "gap-0" }}
          labelProps={{ className: "hidden" }}
          inputGroupProps={{ className: "w-full" }}
          inputProps={{
            className: cn(commonClassName, "cursor-pointer rounded-md border bg-background"),
          }}
          addonProps={{
            className: cn(commonClassName, "border-l bg-background px-2"),
          }}
          popoverContentProps={{
            className: "w-[var(--radix-popover-trigger-width)] p-0",
          }}
          commandInputProps={{
            placeholder: "Buscar...",
          }}
        />
      );
    }

    case "date":
      return <Input type="date" value={normalizeDateInput(value)} className={commonClassName} onChange={(e) => onChange(e.target.value)} />;

    case "custom":
      return <span className="text-xs text-destructive">La columna custom necesita `editor` o `cell`.</span>;

    case "text":
    default:
      return (
        <Input
          type="text"
          value={value === null || value === undefined ? "" : String(value)}
          placeholder={column.placeholder}
          className={commonClassName}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/* ============================================================================
 * Actions
 * ========================================================================== */

function buildRowActionDefinitions<TData extends object>(args: {
  row: TData;
  rowId: RowId;
  compact: boolean;
  actionsConfig: TableActionsConfig<TData>;
  onOpen?: EditableTableProps<TData>["onOpen"];
  onCopy?: EditableTableProps<TData>["onCopy"];
  onDownload?: EditableTableProps<TData>["onDownload"];
  onMail?: EditableTableProps<TData>["onMail"];
  onAuth?: EditableTableProps<TData>["onAuth"];
  onPdf?: EditableTableProps<TData>["onPdf"];
  onPrint?: EditableTableProps<TData>["onPrint"];
  onKanban?: EditableTableProps<TData>["onKanban"];
  startEdit: (row: TData) => void;
  deleteRow: (row: TData) => Promise<void>;
  trackAction?: (action: BuiltInRowAction, rowId: RowId, row: TData) => void;
  withStop: (handler: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>) => (event: React.MouseEvent<HTMLButtonElement>) => void;
}): Record<
  BuiltInRowAction,
  {
    visible: boolean;
    title: string;
    icon: React.ReactNode;
    className?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  }
> {
  const {
    row,
    rowId,
    compact,
    actionsConfig,
    onOpen,
    onCopy,
    onDownload,
    onMail,
    onAuth,
    onPdf,
    onPrint,
    onKanban,
    startEdit,
    deleteRow,
    trackAction,
    withStop,
  } = args;

  const enabled = actionsConfig.enabled ?? {};
  const tooltips = {
    ...DEFAULT_TOOLTIPS,
    ...(actionsConfig.tooltips ?? {}),
  };

  return {
    open: {
      visible: Boolean(onOpen && resolveActionVisibility(enabled.open, row, true)),
      title: tooltips.open,
      icon: <Eye className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop((event) => {
        trackAction?.("open", rowId, row);
        const ctx: RowActionClickContext = {
          newTab: Boolean(event.ctrlKey || event.metaKey),
          event,
        };
        void onOpen?.(rowId, row, ctx);
      }),
    },

    edit: {
      visible: resolveActionVisibility(enabled.edit, row, true),
      title: tooltips.edit,
      icon: <Pencil className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("edit", rowId, row);
        startEdit(row);
      }),
    },

    delete: {
      visible: resolveActionVisibility(enabled.delete, row, true),
      title: tooltips.delete,
      icon: <Trash2 className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      className: "text-destructive",
      onClick: withStop(() => {
        trackAction?.("delete", rowId, row);
        return deleteRow(row);
      }),
    },

    copy: {
      visible: Boolean(onCopy && resolveActionVisibility(enabled.copy, row, false)),
      title: tooltips.copy,
      icon: <Copy className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("copy", rowId, row);
        void onCopy?.(rowId, row);
      }),
    },

    download: {
      visible: Boolean(onDownload && resolveActionVisibility(enabled.download, row, false)),
      title: tooltips.download,
      icon: <Download className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("download", rowId, row);
        void onDownload?.(rowId, row);
      }),
    },

    mail: {
      visible: Boolean(onMail && resolveActionVisibility(enabled.mail, row, false)),
      title: tooltips.mail,
      icon: <Mail className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("mail", rowId, row);
        void onMail?.(rowId, row);
      }),
    },

    auth: {
      visible: Boolean(onAuth && resolveActionVisibility(enabled.auth, row, false)),
      title: tooltips.auth,
      icon: <Shield className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("auth", rowId, row);
        void onAuth?.(rowId, row);
      }),
    },

    pdf: {
      visible: Boolean(onPdf && resolveActionVisibility(enabled.pdf, row, false)),
      title: tooltips.pdf,
      icon: <FileText className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("pdf", rowId, row);
        void onPdf?.(rowId, row);
      }),
    },

    print: {
      visible: Boolean(onPrint && resolveActionVisibility(enabled.print, row, false)),
      title: tooltips.print,
      icon: <Printer className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("print", rowId, row);
        void onPrint?.(rowId, row);
      }),
    },

    kanban: {
      visible: Boolean(onKanban && resolveActionVisibility(enabled.kanban, row, false)),
      title: tooltips.kanban,
      icon: <LayoutGrid className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />,
      onClick: withStop(() => {
        trackAction?.("kanban", rowId, row);
        void onKanban?.(rowId, row);
      }),
    },
  };
}

function ActionButtons<TData extends object>(props: {
  row: TData;
  rowId: RowId;
  compact: boolean;
  order: BuiltInRowAction[];
  actionsConfig: TableActionsConfig<TData>;
  onOpen?: EditableTableProps<TData>["onOpen"];
  onCopy?: EditableTableProps<TData>["onCopy"];
  onDownload?: EditableTableProps<TData>["onDownload"];
  onMail?: EditableTableProps<TData>["onMail"];
  onAuth?: EditableTableProps<TData>["onAuth"];
  onPdf?: EditableTableProps<TData>["onPdf"];
  onPrint?: EditableTableProps<TData>["onPrint"];
  onKanban?: EditableTableProps<TData>["onKanban"];
  startEdit: (row: TData) => void;
  deleteRow: (row: TData) => Promise<void>;
  trackAction?: (action: BuiltInRowAction, rowId: RowId, row: TData) => void;
}) {
  const { row, rowId, compact, order, actionsConfig, onOpen, onCopy, onDownload, onMail, onAuth, onPdf, onPrint, onKanban, startEdit, deleteRow, trackAction } =
    props;

  const withStop = (handler: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>) => (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void handler(event);
  };

  const defs = buildRowActionDefinitions({
    row,
    rowId,
    compact,
    actionsConfig,
    onOpen,
    onCopy,
    onDownload,
    onMail,
    onAuth,
    onPdf,
    onPrint,
    onKanban,
    startEdit,
    deleteRow,
    trackAction,
    withStop,
  });

  const visibleActions = order.map((key) => ({ key, def: defs[key] })).filter((item) => item.def.visible);

  if (visibleActions.length === 0) return null;

  return (
    <div className="flex justify-center gap-1">
      {visibleActions.map(({ key, def }) => (
        <Button
          key={key}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compact ? "h-7 w-7" : "h-8 w-8", def.className)}
          title={def.title}
          onClick={def.onClick}
        >
          {def.icon}
        </Button>
      ))}
    </div>
  );
}

/* ============================================================================
 * Component
 * ========================================================================== */

export function EditableTable<TData extends object>(props: EditableTableProps<TData>) {
  const {
    metadata,
    title,
    data,
    columns,
    getRowId,
    searchable = true,
    searchPlaceholder = "Buscar...",
    compact = true,
    actions,

    headerActions,

    allowCreate = false,
    createRowDefault,
    keepCreateValues = false,
    createButtonTitle = "Crear",
    clearCreateButtonTitle = "Limpiar",

    onCreate,
    onSave,
    onDelete,
    onEditStart,
    onRowClick,
    onOpen,
    onCopy,
    onDownload,
    onMail,
    onAuth,
    onPdf,
    onPrint,
    onKanban,
  } = props;

  const trackTableButton = React.useCallback(
    (action: string, label: string, extra?: Record<string, unknown>) => {
      void logButtonClick({
        buttonId: `editable-table:${action}`,
        label,
        module: metadata.module,
        route: metadata.route,
        cod_usuario: metadata.cod_usuario,
        fileName: metadata.fileName ?? "logbotones.log",
        extra,
      });
    },
    [metadata.fileName, metadata.module, metadata.route, metadata.cod_usuario],
  );

  const trackRowAction = React.useCallback(
    (action: BuiltInRowAction, rowId: RowId, row: TData) => {
      trackTableButton(`row-${action}`, ROW_ACTION_LABELS[action], { rowId, row });
    },
    [trackTableButton],
  );

  const [tableData, setTableData] = React.useState<TData[]>(data);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [editingRowId, setEditingRowId] = React.useState<RowId | null>(null);
  const [draftRow, setDraftRow] = React.useState<TData | null>(null);
  const editingRowIdRef = React.useRef<RowId | null>(null);
  const draftRowRef = React.useRef<TData | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [createRow, setCreateRow] = React.useState<TData>(() => ({ ...(createRowDefault ?? {}) }) as TData);

  /* --------------------------------------------------------------------------
   * Column resize state
   * ------------------------------------------------------------------------ */
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfo] = React.useState<ColumnSizingInfoState>({} as ColumnSizingInfoState);

  React.useEffect(() => {
    setTableData(data);
  }, [data]);

  React.useEffect(() => {
    setCreateRow({ ...(createRowDefault ?? {}) } as TData);
  }, [createRowDefault]);

  React.useEffect(() => {
    editingRowIdRef.current = editingRowId;
  }, [editingRowId]);

  React.useEffect(() => {
    draftRowRef.current = draftRow;
  }, [draftRow]);

  const startEdit = React.useCallback(
    (row: TData) => {
      const rowId = getRowId(row);
      const nextDraft = { ...row };
      editingRowIdRef.current = rowId;
      draftRowRef.current = nextDraft;
      setEditingRowId(rowId);
      setDraftRow(nextDraft);
      setError(null);
      onEditStart?.(rowId, row);
    },
    [getRowId, onEditStart],
  );

  const cancelEdit = React.useCallback(() => {
    editingRowIdRef.current = null;
    draftRowRef.current = null;
    setEditingRowId(null);
    setDraftRow(null);
    setError(null);
  }, []);

  const updateDraftValue = React.useCallback((key: keyof TData, value: TData[keyof TData]) => {
    setDraftRow((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      draftRowRef.current = next;
      return next;
    });
  }, []);

  const updateCreateValue = React.useCallback((key: keyof TData, value: TData[keyof TData]) => {
    setCreateRow((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetCreateRow = React.useCallback(() => {
    setCreateRow({ ...(createRowDefault ?? {}) } as TData);
  }, [createRowDefault]);

  const saveEdit = React.useCallback(async () => {
    const currentEditingRowId = editingRowIdRef.current;
    const currentDraftRow = draftRowRef.current;

    if (currentEditingRowId === null || currentDraftRow === null) return;

    const errors = validateRow(currentDraftRow, columns);
    if (errors.length > 0) {
      setError(`Completa los campos requeridos: ${errors.join(", ")}`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onSave?.(currentEditingRowId, currentDraftRow);

      setTableData((prev) => prev.map((item) => (String(getRowId(item)) === String(currentEditingRowId) ? currentDraftRow : item)));

      editingRowIdRef.current = null;
      draftRowRef.current = null;
      setEditingRowId(null);
      setDraftRow(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la fila.");
    } finally {
      setSaving(false);
    }
  }, [columns, getRowId, onSave]);

  const handleCreate = React.useCallback(async () => {
    const errors = validateRow(createRow, columns);
    if (errors.length > 0) {
      setError(`Completa los campos requeridos: ${errors.join(", ")}`);
      return;
    }

    try {
      setSaving(true);
      setError(null);

      await onCreate?.(createRow);

      if (!keepCreateValues) {
        resetCreateRow();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la fila.");
    } finally {
      setSaving(false);
    }
  }, [columns, createRow, keepCreateValues, onCreate, resetCreateRow]);

  const deleteRow = React.useCallback(
    async (row: TData) => {
      const rowId = getRowId(row);

      try {
        await onDelete?.(rowId, row);
        setTableData((prev) => prev.filter((item) => String(getRowId(item)) !== String(rowId)));
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo eliminar la fila.");
      }
    },
    [getRowId, onDelete],
  );

  const actionsConfig = React.useMemo<TableActionsConfig<TData>>(
    () => ({
      showFrontColumn: actions?.showFrontColumn ?? true,
      showBackColumn: actions?.showBackColumn ?? true,
      frontOrder: actions?.frontOrder ?? DEFAULT_FRONT_ACTION_ORDER,
      backOrder: actions?.backOrder ?? DEFAULT_BACK_ACTION_ORDER,
      enabled: actions?.enabled ?? {},
      tooltips: {
        ...DEFAULT_TOOLTIPS,
        ...(actions?.tooltips ?? {}),
      },
    }),
    [actions],
  );

  const hasVisibleFrontActions = React.useMemo(() => {
    if (!actionsConfig.showFrontColumn) return false;

    return tableData.some((row) => {
      const defs = buildRowActionDefinitions({
        row,
        rowId: getRowId(row),
        compact,
        actionsConfig,
        onOpen,
        onCopy,
        onDownload,
        onMail,
        onAuth,
        onPdf,
        onPrint,
        onKanban,
        startEdit,
        deleteRow,
        trackAction: trackRowAction,
        withStop: (handler) => (event) => {
          event.stopPropagation();
          void handler(event);
        },
      });

      return (actionsConfig.frontOrder ?? DEFAULT_FRONT_ACTION_ORDER).some((key) => defs[key].visible);
    });
  }, [actionsConfig, tableData, getRowId, compact, onOpen, onCopy, onDownload, onMail, onAuth, onPdf, onPrint, onKanban, startEdit, deleteRow, trackRowAction]);

  const hasVisibleBackActions = React.useMemo(() => {
    if (!actionsConfig.showBackColumn) return false;

    return (
      tableData.some((row) => {
        const defs = buildRowActionDefinitions({
          row,
          rowId: getRowId(row),
          compact,
          actionsConfig,
          onOpen,
          onCopy,
          onDownload,
          onMail,
          onAuth,
          onPdf,
          onPrint,
          onKanban,
          startEdit,
          deleteRow,
          trackAction: trackRowAction,
          withStop: (handler) => (event) => {
            event.stopPropagation();
            void handler(event);
          },
        });

        return (actionsConfig.backOrder ?? DEFAULT_BACK_ACTION_ORDER).some((key) => defs[key].visible);
      }) || allowCreate
    );
  }, [
    actionsConfig,
    tableData,
    getRowId,
    compact,
    onOpen,
    onCopy,
    onDownload,
    onMail,
    onAuth,
    onPdf,
    onPrint,
    onKanban,
    startEdit,
    deleteRow,
    allowCreate,
    trackRowAction,
  ]);

  const tableColumns = React.useMemo<ColumnDef<TData>[]>(() => {
    const mapped: ColumnDef<TData>[] = [];

    if (hasVisibleFrontActions) {
      mapped.push({
        id: "front_actions",
        header: () => <div className={cn("text-center", compact ? "text-xs" : "text-sm")} />,
        cell: ({ row }) => {
          const original = row.original;
          const rowId = getRowId(original);
          const editing = String(editingRowIdRef.current) === String(rowId);

          if (editing) return null;

          return (
            <ActionButtons<TData>
              row={original}
              rowId={rowId}
              compact={compact}
              order={actionsConfig.frontOrder ?? DEFAULT_FRONT_ACTION_ORDER}
              actionsConfig={actionsConfig}
              onOpen={onOpen}
              onCopy={onCopy}
              onDownload={onDownload}
              onMail={onMail}
              onAuth={onAuth}
              onPdf={onPdf}
              onPrint={onPrint}
              onKanban={onKanban}
              startEdit={startEdit}
              deleteRow={deleteRow}
              trackAction={trackRowAction}
            />
          );
        },
        enableSorting: false,
        enableResizing: false,
        size: compact ? 52 : 60,
        minSize: compact ? 52 : 60,
        maxSize: compact ? 52 : 60,
      });
    }

    mapped.push(
      ...(columns.map((column) => ({
        id: String(column.id),
        accessorKey: column.id,
        header: ({ column: tanColumn }) => {
          const align = getColumnAlign(column);

          return (
            <div
              className={cn(
                "flex items-center gap-2",
                getAlignClass(align),
                align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start",
              )}
            >
              <Button
                type="button"
                variant="ghost"
                className={cn("px-0 hover:bg-transparent", compact ? "h-7 text-xs" : "h-8 text-sm")}
                onClick={() => tanColumn.toggleSorting(tanColumn.getIsSorted() === "asc")}
              >
                {column.header}
                <ArrowUpDown className={cn("ml-2", compact ? "h-3.5 w-3.5" : "h-4 w-4")} />
              </Button>
            </div>
          );
        },
        cell: ({ row }: { row: { original: TData } }) => {
          const original = row.original;
          const rowId = getRowId(original);
          const editing = String(editingRowIdRef.current) === String(rowId);
          const activeDraftRow = draftRowRef.current;
          const activeRow = editing && activeDraftRow ? activeDraftRow : original;
          const value = activeRow[column.id];
          const options = getOptions(column, activeRow);
          const align = getColumnAlign(column);
          const textClassName = getTextClassName(column, value as TData[keyof TData], activeRow);

          if (editing && isEditable(column, activeRow)) {
            return (
              <div className={getAlignClass(align)}>
                <CellEditor
                  row={activeRow}
                  column={column}
                  value={value}
                  compact={compact}
                  onChange={(newValue) => updateDraftValue(column.id, newValue as TData[keyof TData])}
                />
              </div>
            );
          }

          if (column.cell) {
            return <div className={cn(getAlignClass(align), compact ? "text-xs" : "text-sm", textClassName)}>{column.cell(activeRow)}</div>;
          }

          return (
            <div className={cn("truncate", getAlignClass(align), compact ? "text-xs leading-4" : "text-sm leading-5", column.className, textClassName)}>
              {defaultDisplayValue(value as TData[keyof TData], activeRow, column, options)}
            </div>
          );
        },
        enableResizing: true,
        size: typeof column.width === "number" ? column.width : 180,
        minSize: 80,
        maxSize: 600,
      })) as ColumnDef<TData>[]),
    );

    if (hasVisibleBackActions) {
      mapped.push({
        id: "back_actions",
        header: () => <div className={cn("text-right", compact ? "text-xs" : "text-sm")}>Acciones</div>,
        cell: ({ row }) => {
          const original = row.original;
          const rowId = getRowId(original);
          const editing = String(editingRowIdRef.current) === String(rowId);
          const canEdit = resolveActionVisibility(actionsConfig.enabled?.edit, original, true);

          const withStop = (handler: (event: React.MouseEvent<HTMLButtonElement>) => void | Promise<void>) => (event: React.MouseEvent<HTMLButtonElement>) => {
            event.stopPropagation();
            void handler(event);
          };

          if (editing) {
            return (
              <div className="flex justify-end gap-1">
                {canEdit ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={compact ? "h-7 w-7" : "h-8 w-8"}
                      title="Guardar"
                      onClick={withStop(() => {
                        trackTableButton("save-edit", "Guardar", { rowId });
                        return saveEdit();
                      })}
                      disabled={saving}
                    >
                      <Check className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={compact ? "h-7 w-7" : "h-8 w-8"}
                      title="Cancelar"
                      onClick={withStop(() => {
                        trackTableButton("cancel-edit", "Cancelar", { rowId });
                        cancelEdit();
                      })}
                      disabled={saving}
                    >
                      <X className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                    </Button>
                  </>
                ) : null}
              </div>
            );
          }

          return (
            <div className="flex justify-end">
              <ActionButtons<TData>
                row={original}
                rowId={rowId}
                compact={compact}
                order={actionsConfig.backOrder ?? DEFAULT_BACK_ACTION_ORDER}
                actionsConfig={actionsConfig}
                onOpen={onOpen}
                onCopy={onCopy}
                onDownload={onDownload}
                onMail={onMail}
                onAuth={onAuth}
                onPdf={onPdf}
                onPrint={onPrint}
                onKanban={onKanban}
                startEdit={startEdit}
                deleteRow={deleteRow}
                trackAction={trackRowAction}
              />
            </div>
          );
        },
        enableSorting: false,
        enableResizing: false,
        size: compact ? 160 : 190,
        minSize: compact ? 160 : 190,
        maxSize: compact ? 160 : 190,
      });
    }

    return mapped;
  }, [
    hasVisibleFrontActions,
    hasVisibleBackActions,
    compact,
    getRowId,
    columns,
    updateDraftValue,
    actionsConfig,
    onOpen,
    onCopy,
    onDownload,
    onMail,
    onAuth,
    onPdf,
    onPrint,
    onKanban,
    startEdit,
    deleteRow,
    saveEdit,
    cancelEdit,
    saving,
    trackRowAction,
    trackTableButton,
  ]);

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    state: {
      sorting,
      globalFilter,
      columnSizing,
      columnSizingInfo,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnSizingChange: setColumnSizing,
    onColumnSizingInfoChange: setColumnSizingInfo,
    columnResizeMode: "onChange",
    defaultColumn: {
      size: 180,
      minSize: 80,
      maxSize: 600,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue).toLowerCase().trim();
      if (!search) return true;

      return columns.some((column) => {
        const value = row.original[column.id];
        return getSearchableText(value, row.original, column).includes(search);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && editingRowId !== null) {
        cancelEdit();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cancelEdit, editingRowId]);

  const renderCreateCell = React.useCallback(
    (column: EditableColumn<TData>) => {
      const value = createRow[column.id];
      const align = getColumnAlign(column);

      if (!isEditable(column, createRow)) {
        return <div className={getAlignClass(align)} />;
      }

      return (
        <div className={getAlignClass(align)}>
          <CellEditor
            row={createRow}
            column={column}
            value={value}
            compact={compact}
            onChange={(newValue) => updateCreateValue(column.id, newValue as TData[keyof TData])}
          />
        </div>
      );
    },
    [compact, createRow, updateCreateValue],
  );

  return (
    <div className="w-full rounded-xl border bg-background">
      <div className="flex flex-col gap-3 border-b px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {title ? <h2 className={cn("font-semibold tracking-tight", compact ? "text-sm" : "text-base")}>{title}</h2> : null}
          {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          {headerActions ? <div className="flex flex-nowrap  items-center gap-2">{headerActions}</div> : null}

          {searchable ? (
            <Input
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn("w-full sm:w-64", compact ? "h-8 text-xs" : "h-9 text-sm")}
            />
          ) : null}
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table
          style={{
            width: table.getTotalSize(),
            minWidth: "100%",
          }}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const currentColumn = columns.find((col) => col.id === header.column.id);

                  const align = header.column.id === "front_actions" ? "center" : header.column.id === "back_actions" ? "right" : getColumnAlign(currentColumn);

                  return (
                    <TableHead
                      key={header.id}
                      style={{
                        width: header.getSize(),
                        minWidth: header.getSize(),
                        maxWidth: header.getSize(),
                        position: "relative",
                      }}
                      className={cn(compact ? "h-8 px-2" : "h-10 px-3", getAlignClass(align), "overflow-hidden")}
                    >
                      <div className="flex h-full items-center">
                        <div className="min-w-0 flex-1">{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</div>

                        {header.column.getCanResize() ? (
                          <div
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                            className={cn(
                              "absolute right-0 top-0 h-full w-2 cursor-col-resize select-none touch-none",
                              "after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border",
                              header.column.getIsResizing() && "after:bg-primary",
                            )}
                            title="Redimensionar columna"
                          />
                        ) : null}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}

            {allowCreate ? (
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {hasVisibleFrontActions ? (
                  <TableHead
                    className={cn(compact ? "px-2 py-1.5" : "px-3 py-2", "text-center")}
                    style={{
                      width: table.getColumn("front_actions")?.getSize(),
                      minWidth: table.getColumn("front_actions")?.getSize(),
                      maxWidth: table.getColumn("front_actions")?.getSize(),
                    }}
                  />
                ) : null}

                {columns.map((column) => {
                  const col = table.getColumn(String(column.id));

                  return (
                    <TableHead
                      key={`create-${column.id}`}
                      className={cn(compact ? "px-2 py-1.5" : "px-3 py-2", getAlignClass(getColumnAlign(column)))}
                      style={{
                        width: col?.getSize(),
                        minWidth: col?.getSize(),
                        maxWidth: col?.getSize(),
                      }}
                    >
                      {renderCreateCell(column)}
                    </TableHead>
                  );
                })}

                {hasVisibleBackActions ? (
                  <TableHead
                    className={cn(compact ? "px-2 py-1.5" : "px-3 py-2", "text-right")}
                    style={{
                      width: table.getColumn("back_actions")?.getSize(),
                      minWidth: table.getColumn("back_actions")?.getSize(),
                      maxWidth: table.getColumn("back_actions")?.getSize(),
                    }}
                  >
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={compact ? "h-7 w-7" : "h-8 w-8"}
                        title={createButtonTitle}
                        onClick={() => {
                          trackTableButton("create", createButtonTitle, { row: createRow });
                          void handleCreate();
                        }}
                        disabled={saving}
                      >
                        <Plus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className={compact ? "h-7 w-7" : "h-8 w-8"}
                        title={clearCreateButtonTitle}
                        onClick={() => {
                          trackTableButton("clear-create", clearCreateButtonTitle);
                          resetCreateRow();
                        }}
                        disabled={saving}
                      >
                        <RotateCcw className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
                      </Button>
                    </div>
                  </TableHead>
                ) : null}
              </TableRow>
            ) : null}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => onRowClick?.(getRowId(row.original), row.original)}>
                  {row.getVisibleCells().map((cell) => {
                    const currentColumn = columns.find((col) => col.id === cell.column.id);

                    const align = cell.column.id === "front_actions" ? "center" : cell.column.id === "back_actions" ? "right" : getColumnAlign(currentColumn);

                    return (
                      <TableCell
                        key={cell.id}
                        className={cn("align-middle", compact ? "px-2 py-1.5" : "px-3 py-2", getAlignClass(align))}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          maxWidth: cell.column.getSize(),
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={table.getAllColumns().length}
                  className={cn("text-center text-muted-foreground", compact ? "h-16 text-xs" : "h-20 text-sm")}
                >
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-2 border-t px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </div>

        <div className="flex items-center gap-2">
          <span className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}>Filas por página</span>

          <Select value={String(table.getState().pagination.pageSize)} onValueChange={(value) => table.setPageSize(Number(value))}>
            <SelectTrigger className={cn("w-20", compact ? "h-8 text-xs" : "h-9 text-sm")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[5, 10, 15, 25, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={compact ? "h-7 w-7" : "h-8 w-8"}
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            title="Primera página"
          >
            <ChevronsLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={compact ? "h-7 w-7" : "h-8 w-8"}
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            title="Página anterior"
          >
            <ChevronLeft className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={compact ? "h-7 w-7" : "h-8 w-8"}
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            title="Página siguiente"
          >
            <ChevronRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className={compact ? "h-7 w-7" : "h-8 w-8"}
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            title="Última página"
          >
            <ChevronsRight className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </div>
      </div>
    </div>
  );
}
