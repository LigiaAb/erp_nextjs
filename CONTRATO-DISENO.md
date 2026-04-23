# 📘 Frontend Contract – Formularios + Catálogos + TanStack + Zod

## 🎯 Objetivo

Estandarizar la forma en que se construyen:

- Formularios reutilizables
- Catálogos con TanStack Query
- Validaciones con Zod
- Transformaciones de datos (UI ↔ API)
- CRUD simples con EditableTable

Para:

- evitar duplicación de código
- reducir mantenimiento
- mantener consistencia entre módulos

---

# 🧱 Estructura base

```txt
fetch/
  modulo/
    catalogos.ts

modules/
  modulo/
    pantalla/
      components/
        formulario.tsx
        tabla.tsx
      hooks/
        useFormulario.ts
      schemas/
        form.schema.ts
      lib/
        fieldRules.ts
        transforms.ts
```

---

# 🧠 Principios clave

## 1. El formulario es reutilizable

- NO pertenece a un módulo
- NO contiene lógica hardcodeada por pantalla

❌ Incorrecto:

```ts
if (modulo === "tarifa") { ... }
```

✅ Correcto:

```ts
props.config;
props.inputsToHide;
props.inputsReadOnly;
```

---

## 2. Un solo estado de valores

```ts
const [values, setValues] = useState<FormValues>();
```

❌ NO usar:

```ts
valuesServicio;
valuesMetodo;
valuesFiltro;
```

✅ Separación SOLO al final:

```ts
buildPayload(values) => {
  servicio: {...}
  metodo: {...}
}
```

---

## 3. Definición de campos centralizada

Archivo:

```txt
lib/fieldRules.ts
```

Ejemplo:

```ts
export const fieldRules = {
  empresa: {
    cod: "cod_empresa",
    catalogo: "empresas",
    payload: ["servicio"],
    readonly: true,
  },
  tipoTransporte: {
    cod: "cod_tipo_transporte",
    reset: ["tipoServicio"],
    payload: ["servicio"],
  },
};
```

---

## 4. Transformaciones separadas

Archivo:

```txt
lib/transforms.ts
```

### UI → API

```ts
export function formToPayload(values) {
  return {
    cod_empresa: values.empresa?.value,
    cod_cc: values.centroCosto?.value,
  };
}
```

### API → UI

```ts
export function apiToForm(item, catalogos) {
  return {
    empresa: catalogos.empresas.find((e) => e.value === item.cod_empresa),
  };
}
```

---

## 5. Validación con Zod

Archivo:

```txt
schemas/form.schema.ts
```

Ejemplo:

```ts
import { z } from "zod";

export const formSchema = z.object({
  empresa: z
    .object({
      label: z.string(),
      value: z.number(),
    })
    .nullable(),

  nombre: z.string().min(1, "Requerido"),

  fechaInicio: z.date().nullable(),
});
```

---

## 6. Catálogos con TanStack Query

Archivo:

```txt
fetch/modulo/catalogos.ts
```

Ejemplo:

```ts
export const fetchEmpresas = createCatalogFetcher("/api/appweb/listaempresas", mapEmpresa);

export const useFetchEmpresas = createCatalogHook("empresas", fetchEmpresas);
```

---

## 7. Mutations (insert/update)

```ts
export const insertarTarifa = createCatalogMutationFetcher<InsertBody, Response>("/api/appweb/insertar", "POST");

export const useInsertarTarifa = createCatalogMutationHook("insertar_tarifa", insertarTarifa);
```

---

# 🧩 Props del formulario (CONTRATO)

```ts
export interface FormularioProps {
  catalogos?: Partial<FormCatalogos>;
  valoresDefault?: Partial<FormValues>;
  inputsToHide?: string[];
  inputsReadOnly?: string[];
  groupsToHide?: string[];
  funciones?: FormularioFunciones;
}
```

---

# ⚙️ Comportamiento esperado

## Catálogos

```ts
const catalogosFinal = {
  ...catalogosInternos,
  ...catalogosProps,
};
```

---

## Defaults

```ts
const valoresIniciales = {
  ...DEFAULT_VALUES,
  ...valoresDefault,
};
```

---

## Ocultar campos

```ts
if (inputsToHide.includes(field.id)) return null;
```

---

## Bloquear campos

```ts
const disabled = inputsReadOnly.includes(field.id);
```

---

# 🔄 Manejo de cambios

```ts
const onInput = (name, value) => {
  setValues((prev) => ({
    ...prev,
    [name]: value,
  }));

  funciones?.onCampoChange?.({
    name,
    value,
    values: newValues,
  });
};
```

---

# 🔗 Reglas dinámicas

Las reglas deben vivir en:

```txt
lib/fieldRules.ts
```

NO en JSX.

---

# 🧩 CRUD SIMPLE (EditableTable)

## Cuándo aplica

Usar `EditableTable` cuando el caso sea un CRUD simple, por ejemplo:

- catálogo simple
- edición inline
- create / update / delete directo
- sin payloads múltiples
- sin reglas complejas de visibilidad
- sin dependencias fuertes entre campos

---

## Contrato de EditableTable

En CRUD simple, la tabla se usa como componente base y NO se modifica.

Los eventos se usan así:

```ts
onCreate(newRow);
onSave(rowId, updatedRow);
onDelete(rowId, row);
```

### Regla importante

- `onCreate` = crear fila nueva
- `onSave` = editar fila existente
- `onDelete` = eliminar fila

👉 `onCreate` NO es lo mismo que `onSave`.

---

## Uso esperado

```tsx
<EditableTable
  metadata={{
    module: "configuracion/catalogos/x",
    fileName: "log.log",
  }}
  title="Catalogo X"
  getRowId={(row) => row.value}
  columns={columns}
  data={rows}
  allowCreate
  onCreate={async (newRow) => {
    await insertar.mutateAsync({
      body: { ...newRow, cod_estado: 1 },
    });
    await refetch();
  }}
  onSave={async (rowId, updatedRow) => {
    await actualizar.mutateAsync({
      body: {
        cod_x: Number(rowId),
        ...updatedRow,
        cod_estado: 1,
      },
    });
    await refetch();
  }}
  onDelete={async (rowId, row) => {
    await actualizar.mutateAsync({
      body: {
        cod_x: Number(rowId),
        ...row,
        cod_estado: 4,
      },
    });
    await refetch();
  }}
/>
```

---

## Qué cambia en cada CRUD simple

Solo se adapta:

- `columns`
- `useFetchX`
- `useInsertarX`
- `useActualizarX`
- `onCreate`
- `onSave`
- `onDelete`

---

## Qué NO se toca

❌ `EditableTable`
❌ contrato de `onCreate` / `onSave` / `onDelete`
❌ comportamiento base del componente

---

## Validación en CRUD simple

La tabla ya maneja validación básica de campos requeridos según `columns.required`.

Si se necesita validación adicional de negocio, debe respetar el contrato del componente.

Ejemplo:

```ts
const result = schema.safeParse(data);

if (!result.success) {
  throw new Error(result.error.issues[0].message);
}
```

---

## Regla para errores

Si `EditableTable` espera errores por `throw`, entonces las validaciones adicionales deben lanzar error así:

```ts
throw new Error("Mensaje de error");
```

No retornar valores especiales.

❌ Incorrecto:

```ts
return false;
return { error: true };
```

---

## Cuándo NO usar EditableTable

NO usar `EditableTable` si el caso requiere:

- múltiples payloads
- transformaciones complejas
- reglas dinámicas de visibilidad
- catálogos dependientes
- lógica fuerte entre campos

👉 En esos casos usar formulario completo.

---

# 🚫 PROHIBIDO

## ❌ Duplicar formularios

```txt
FormularioTarifaA.tsx
FormularioTarifaB.tsx
```

---

## ❌ Lógica por módulo dentro del form

```ts
if (tipoFormulario === "x")
```

---

## ❌ Validaciones en el JSX

```tsx
{values.tipo === "X" && ...}
```

---

## ❌ Estados separados por payload

```ts
valuesServicio;
valuesMetodo;
```

---

## ❌ Modificar EditableTable para adaptar cada CRUD simple

EditableTable se toma como base fija.
Lo que cambia es su uso, no el componente.

---

# ✅ BUENAS PRÁCTICAS

✔ Un solo `values`
✔ Reglas centralizadas
✔ Transformaciones separadas
✔ Zod para validación
✔ TanStack para fetch
✔ Props para configuración
✔ Formulario desacoplado
✔ CRUD simple con EditableTable
✔ `onCreate` para crear
✔ `onSave` para editar
✔ `onDelete` para eliminar

---

# 🧠 Insight importante

El formulario pertenece a:

> **la entidad (tarifa, cotización, etc.)**

NO al módulo.

En CRUD simple, la tabla también se trata como componente reutilizable base.

---

# 🚀 Flujo completo

## Formularios

1. TanStack obtiene catálogos
2. Se procesan defaults
3. Se construyen valores iniciales
4. Usuario interactúa
5. Se valida con Zod
6. Se transforma a payload
7. Se envía con mutation

## CRUD simple con EditableTable

1. TanStack obtiene catálogo
2. Se definen `columns`
3. `allowCreate` habilita nueva fila
4. `onCreate` inserta
5. `onSave` actualiza
6. `onDelete` elimina
7. Se hace `refetch`

---

# 🧪 Recomendación

Usar como base:

👉 `FormularioTarifaV2`

porque ya separa:

- reglas
- payloads
- catálogo
- lógica

Y para CRUD simple, usar como base el patrón de `EditableTable` con:

- `onCreate`
- `onSave`
- `onDelete`

---

# 📌 Regla final

> Las carpetas organizan el código,
> pero las props definen la reutilización.

Y en CRUD simple:

> La tabla base no se toca,
> solo se adapta su uso.

---
