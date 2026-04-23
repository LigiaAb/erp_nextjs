import { z } from "zod";

/**
 * 🔴 CAMBIAR: campos reales y sus validaciones.
 */
export const formSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  descripcion: z.string().optional(),
});

// Tipo automático: no lo escribas dos veces
export type FormValues = z.infer<typeof formSchema>;