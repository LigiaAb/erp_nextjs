"use client";
import * as React from "react";
import { Loader2, X } from "lucide-react";
import clsx from "clsx";

import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxGroup, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group";

type Key = string | number;

type Props<T> = {
  id: string;
  label: string;

  /**
   * Valor seleccionado actualmente.
   */
  value: T | null;

  /**
   * Notifica el valor seleccionado.
   */
  onChange: (value: T | null) => void;

  /**
   * Función async para consultar opciones.
   *
   * Recibe el texto ingresado y debe retornar un arreglo de opciones.
   */
  fetchOptions: (search: string) => Promise<T[]>;

  /**
   * Cómo obtener el value interno de una opción.
   */
  getOptionValue: (option: T) => Key;

  /**
   * Cómo obtener el label visible de una opción.
   */
  getOptionLabel: (option: T) => string;

  /**
   * Campos extra para buscar del lado cliente.
   *
   * Esto solo aplica sobre el resultado recibido.
   */
  searchFields?: (keyof T)[];

  /**
   * Placeholder visual del input.
   */
  placeholder?: string;

  /**
   * Placeholder del buscador interno.
   */
  searchPlaceholder?: string;

  /**
   * Errores visuales del campo.
   */
  errors?: { message: string }[];

  /**
   * Si true, permite limpiar la selección.
   */
  clearable?: boolean;

  /**
   * Solo lectura.
   */
  readOnly?: boolean;

  /**
   * Longitud mínima para disparar búsqueda.
   */
  minSearchLength?: number;

  /**
   * Delay para debounce del texto de búsqueda.
   */
  debounceMs?: number;

  /**
   * Si true, permite consultar incluso con string vacío.
   */
  fetchOnEmpty?: boolean;

  /**
   * Resultado inicial mientras todavía no se ha consultado.
   */
  initialOptions?: T[];

  /**
   * Libertad de diseño.
   */
  fieldProps?: React.ComponentProps<typeof Field>;
  labelProps?: React.ComponentProps<typeof FieldLabel>;
  errorProps?: Omit<React.ComponentProps<typeof FieldError>, "errors">;

  comboboxProps?: Omit<React.ComponentProps<typeof Combobox>, "items" | "value" | "onValueChange" | "itemToStringValue" | "readOnly">;
  comboboxContentProps?: React.ComponentProps<typeof ComboboxContent>;
  comboboxInputProps?: React.ComponentProps<typeof ComboboxInput>;
  comboboxGroupProps?: React.ComponentProps<typeof ComboboxGroup>;
  comboboxEmptyProps?: React.ComponentProps<typeof ComboboxEmpty>;

  /**
   * Props del botón clear.
   */
  clearButtonProps?: React.ComponentProps<typeof InputGroupButton>;

  className?: string;
};

/**
 * Hook simple para debounce.
 *
 * Recibe un valor y lo devuelve con retraso.
 * Se usa para no disparar fetch en cada tecla inmediatamente.
 */
function useDebouncedValue<T>(value: T, delay = 300) {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

export const AsyncAutoCompleteField = <T,>({
  id,
  label,
  value,
  onChange,
  fetchOptions,
  getOptionValue,
  getOptionLabel,
  searchFields = [],
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  errors = [],
  clearable = true,
  readOnly = false,
  minSearchLength = 0,
  debounceMs = 300,
  fetchOnEmpty = true,
  initialOptions,

  fieldProps,
  labelProps,
  errorProps,

  comboboxProps,
  comboboxContentProps,
  comboboxInputProps,
  comboboxGroupProps,
  comboboxEmptyProps,

  clearButtonProps,

  className,
}: Props<T>) => {
  /**
   * Texto actual del buscador interno.
   */
  const [query, setQuery] = React.useState("");

  /**
   * Opciones iniciales estables.
   *
   * Esto evita referencias nuevas por defecto en cada render.
   */
  const safeInitialOptions = React.useMemo(() => initialOptions ?? [], [initialOptions]);

  /**
   * Opciones actualmente disponibles en el componente.
   *
   * Empiezan con initialOptions y luego se reemplazan
   * con lo que devuelva fetchOptions.
   */
  const [options, setOptions] = React.useState<T[]>(safeInitialOptions);

  /**
   * Estado local de carga.
   */
  const [isFetching, setIsFetching] = React.useState(false);

  /**
   * Error local de la consulta.
   */
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  /**
   * Texto con debounce.
   */
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  /**
   * Label visible del valor seleccionado.
   */
  const selectedLabel = value ? getOptionLabel(value) : "";

  /**
   * Define si se puede limpiar el valor actual.
   */
  const canClear = clearable && value !== null && !readOnly;

  /**
   * Define si la consulta debe ejecutarse.
   */
  const shouldFetch = !readOnly && (fetchOnEmpty ? true : debouncedQuery.trim().length >= minSearchLength);

  /**
   * Normaliza texto para búsquedas del lado cliente.
   *
   * Convierte a:
   * - minúsculas
   * - sin tildes
   */
  const norm = React.useCallback((s: unknown) => {
    return String(s ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }, []);

  /**
   * Si cambian las opciones iniciales desde fuera,
   * el componente sincroniza su estado local.
   */
  React.useEffect(() => {
    setOptions(safeInitialOptions);
  }, [safeInitialOptions]);

  /**
   * Cada vez que cambian:
   * - debouncedQuery
   * - fetchOptions
   * - reglas de búsqueda
   *
   * se evalúa si se debe consultar.
   */
  React.useEffect(() => {
    if (!shouldFetch) {
      setFetchError(null);
      setIsFetching(false);
      return;
    }

    let isActive = true;

    const runFetch = async () => {
      try {
        /**
         * Si no se permite consultar en vacío y todavía no se cumple
         * la longitud mínima, no ejecutar la búsqueda.
         */
        if (!fetchOnEmpty && debouncedQuery.trim().length < minSearchLength) return;

        setIsFetching(true);
        setFetchError(null);

        const result = await fetchOptions(debouncedQuery.trim());

        /**
         * Evita actualizar estado si este efecto ya quedó obsoleto
         * por un cambio rápido de búsqueda o desmontaje.
         */
        if (!isActive) return;

        setOptions(Array.isArray(result) ? result : []);
      } catch (error) {
        if (!isActive) return;

        const message = error instanceof Error ? error.message : "Error al cargar opciones";

        setFetchError(message);
        setOptions([]);
      } finally {
        if (!isActive) return;
        setIsFetching(false);
      }
    };

    void runFetch();

    return () => {
      isActive = false;
    };
  }, [shouldFetch, fetchOnEmpty, minSearchLength, fetchOptions, debouncedQuery]);

  /**
   * Filtro cliente adicional.
   *
   * Sirve por si el backend devuelve una lista amplia
   * y se quiere refinar un poco más en frontend.
   */
  const filteredOptions = React.useMemo(() => {
    const q = norm(query).trim();

    if (!q) return options;

    return options.filter((option) => {
      const optionLabel = getOptionLabel(option);
      const optionKey = String(getOptionValue(option));
      const extras = searchFields.map((field) => String(option[field] ?? ""));
      const haystack = norm([optionLabel, optionKey, ...extras].join(" "));

      return haystack.includes(q);
    });
  }, [options, query, getOptionLabel, getOptionValue, searchFields, norm]);

  const handleClear = (ev: React.MouseEvent<HTMLButtonElement> | null) => {
    ev?.preventDefault();
    ev?.stopPropagation();
    onChange(null);
    setQuery("");
  };

  const handleSelect = React.useCallback(
    (currentValue: unknown) => {
      const selectedValue = String(currentValue ?? "");

      const selected = filteredOptions.find((o) => String(getOptionValue(o)) === selectedValue) ?? null;

      onChange(selected);
      setQuery("");
    },
    [filteredOptions, getOptionValue, onChange],
  );

  return (
    <Field {...fieldProps} className={clsx("w-full", fieldProps?.className, readOnly && "cursor-not-allowed opacity-70", className)}>
      <FieldLabel htmlFor={id} {...labelProps}>
        {label}
      </FieldLabel>

      <Combobox
        readOnly={readOnly}
        items={filteredOptions}
        value={value ? String(getOptionValue(value)) : null}
        onValueChange={handleSelect}
        itemToStringValue={(itemValue: unknown) => {
          if (itemValue == null) return "";
          return getOptionLabel(itemValue as T) ?? "";
        }}
        inputValue={(selectedLabel || query) ?? ""}
        onInputValueChange={setQuery}
        {...comboboxProps}
      >
        <ComboboxInput id={id} placeholder={selectedLabel || placeholder} aria-label={label} {...comboboxInputProps}>
          {/* right addon */}
          {!(!canClear || clearButtonProps?.disabled) && (
            <InputGroupAddon className={clsx("gap-1")} align="inline-end">
              <InputGroupButton
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Clear input"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  clearButtonProps?.onClick?.(e);
                  handleClear(e);
                }}
                disabled={!canClear || clearButtonProps?.disabled}
                {...clearButtonProps}
                className={clsx("hover:bg-transparent hover:text-destructive cursor-pointer", clearButtonProps?.className)}
              >
                <X className="h-4 w-4" />
              </InputGroupButton>
            </InputGroupAddon>
          )}

          {isFetching && (
            <InputGroupAddon className={clsx("gap-1")} align="inline-end">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </InputGroupAddon>
          )}
        </ComboboxInput>

        <ComboboxContent className={clsx("p-0", comboboxContentProps?.className)} {...comboboxContentProps}>
          {fetchError ? (
            <div className="px-3 py-3 text-sm text-destructive">{fetchError}</div>
          ) : (
            <>
              <ComboboxEmpty {...comboboxEmptyProps}>{isFetching ? "Cargando..." : "No encontrado"}</ComboboxEmpty>

              <ComboboxGroup {...comboboxGroupProps}>
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
                        {/* <Check className={clsx("mr-2 h-4 w-4", isSelected ? "opacity-100" : "opacity-0")} /> */}
                        {getOptionLabel(opt)}
                      </ComboboxItem>
                    );
                  }}
                </ComboboxList>
              </ComboboxGroup>
            </>
          )}
        </ComboboxContent>
      </Combobox>

      <FieldError errors={errors} {...errorProps} />
    </Field>
  );
};

export default AsyncAutoCompleteField;
