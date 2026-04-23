"use client";
import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import clsx from "clsx";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { BaseUIEvent } from "@base-ui/react";

type Key = string | number;

type Props<T, TOptions = T[]> = {
  id: string;
  label: string;
  options: TOptions;
  value: T | null;
  onChange: (value: T | null) => void;

  getOptionValue: (option: T) => Key;
  getOptionLabel: (option: T) => string;

  /**
   * Permite adaptar options cuando no viene como T[].
   * Si no se envía, se asume que options ya es un arreglo.
   */
  normalizeOptions?: (options: TOptions) => T[];

  placeholder?: string;
  errors?: { message: string }[];
  searchFields?: (keyof T)[];

  // libertad de diseño
  fieldProps?: React.ComponentProps<typeof Field>;
  labelProps?: React.ComponentProps<typeof FieldLabel>;
  errorProps?: Omit<React.ComponentProps<typeof FieldError>, "errors">;

  inputGroupProps?: React.ComponentProps<typeof InputGroup>;
  inputProps?: Omit<React.ComponentProps<typeof InputGroupInput>, "id" | "readOnly" | "value" | "placeholder">;
  addonProps?: React.ComponentProps<typeof InputGroupAddon>;

  comboboxProps?: Omit<React.ComponentProps<typeof Combobox>, "open" | "onOpenChange">;
  comboboxContentProps?: React.ComponentProps<typeof ComboboxContent>;
  comboboxInputProps?: React.ComponentProps<typeof ComboboxInput>;
  comboboxGroupProps?: React.ComponentProps<typeof ComboboxGroup>;
  comboboxEmptyProps?: React.ComponentProps<typeof ComboboxEmpty>;

  /** Permite apagar el botón clear. */
  clearable?: boolean;

  /** Props del botón clear. */
  clearButtonProps?: React.ComponentProps<typeof InputGroupButton>;

  /** Pone el campo en modo solo lectura, deshabilitando interacciones pero manteniendo estilos. */
  readOnly?: boolean;

  className?: string;
};

export const AutoCompleteField = <T, TOptions = T[]>({
  id,
  label,
  options,
  value,
  onChange,
  getOptionValue,
  getOptionLabel,
  normalizeOptions,
  placeholder = "Seleccionar...",
  errors = [],

  fieldProps,
  labelProps,
  errorProps,

  comboboxContentProps,
  comboboxGroupProps,
  comboboxEmptyProps,

  clearable = true,
  clearButtonProps,

  readOnly = false,

  className,
}: Props<T, TOptions>) => {
  const [query, setQuery] = React.useState("");

  const canClear = clearable && value !== null;

  const safeOptions = React.useMemo<T[]>(() => {
    if (normalizeOptions) return normalizeOptions(options);
    return Array.isArray(options) ? options : [];
  }, [options, normalizeOptions]);

  const handleClear = (ev: React.MouseEvent<HTMLButtonElement> | null) => {
    ev?.preventDefault();
    onChange(null);
    setQuery("");
  };

  const handleSelect = React.useCallback(
    (currentValue: unknown) => {
      const selectedValue = String(currentValue ?? "");

      const selected = safeOptions.find((o) => String(getOptionValue(o)) === selectedValue) ?? null;

      onChange(selected);
      setQuery("");
    },
    [safeOptions, getOptionValue, onChange],
  );

  return (
    <Field {...fieldProps} className={clsx("w-full", fieldProps?.className, readOnly && "cursor-not-allowed opacity-70")}>
      <FieldLabel htmlFor={id} {...labelProps}>
        {label}
      </FieldLabel>

      <Combobox readOnly={readOnly} items={safeOptions} value={value} onValueChange={handleSelect} itemToStringValue={getOptionLabel}>
        <ComboboxInput id={id}>
          {/* right addon */}
          {!(!canClear || clearButtonProps?.disabled) && (
            <InputGroupAddon className={clsx("gap-1")} align="inline-end">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Clear input"
                // ✅ evita blur / efectos raros
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  clearButtonProps?.onClick?.(e);
                  handleClear(e);
                }}
                disabled={!canClear || clearButtonProps?.disabled}
                {...clearButtonProps}
                className={` hover:bg-transparent hover:text-destructive cursor-pointer ${clearButtonProps?.className}`}
              >
                <X className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </ComboboxInput>

        <ComboboxContent className={clsx(" p-0", comboboxContentProps?.className)} {...comboboxContentProps}>
          {/* Search input interno del combobox */}

          <ComboboxEmpty {...comboboxEmptyProps}>No encontrado</ComboboxEmpty>

          <ComboboxList>
            {(opt) => {
              const key = String(getOptionValue(opt));
              const isSelected = value ? String(getOptionValue(value)) === key : false;

              return (
                <ComboboxItem
                  key={key}
                  value={key}
                  className={clsx("cursor-pointer", isSelected && "bg-primary/20", "hover:bg-primary/10")}
                  {...(isSelected && { "aria-selected": true })}
                >
                  {getOptionLabel(opt)}
                </ComboboxItem>
              );
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      <FieldError errors={errors} {...errorProps} />
    </Field>
  );
};

export default AutoCompleteField;
