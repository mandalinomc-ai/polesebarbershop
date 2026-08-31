import { z } from "zod";
import { ANYONE_BARBER_ID, getBarber, resolveServices } from "./catalog";
import { normalizeItalianPhone } from "./phone";

const nameField = z
  .string()
  .trim()
  .min(2, "Inserisci almeno 2 caratteri")
  .max(80, "Testo troppo lungo")
  .regex(/^[\p{L}\s.'’-]+$/u, "Usa solo lettere");

export const italianPhoneSchema = z
  .string()
  .trim()
  .min(8, "Inserisci un numero di telefono")
  .transform((value, ctx) => {
    const normalised = normalizeItalianPhone(value);
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Inserisci un numero italiano valido (+39)",
      });
      return z.NEVER;
    }
    return normalised;
  });

export const bookingSchema = z.object({
  serviceIds: z
    .array(z.string().min(1))
    .min(1, "Seleziona almeno un servizio")
    .max(6, "Troppi servizi selezionati"),
  barberId: z.string().min(1, "Seleziona un barbiere"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Orario non valido"),
  firstName: nameField,
  lastName: nameField,
  email: z
    .string()
    .trim()
    .email("Email non valida")
    .max(120)
    .transform((v) => v.toLowerCase()),
  phone: italianPhoneSchema,
  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Il consenso privacy è obbligatorio" }),
  }),
  notes: z.string().trim().max(500).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const availabilityQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  barberId: z.string().min(1, "Barbiere mancante"),
  serviceIds: z
    .string()
    .min(1, "Servizio mancante")
    .transform((v) => v.split(",").map((s) => s.trim()).filter(Boolean))
    .pipe(z.array(z.string()).min(1, "Seleziona almeno un servizio")),
});

export const adminLoginSchema = z
  .object({
    username: z.string().trim().optional(),
    id: z.string().trim().optional(),
    password: z.string().min(1, "Inserisci la password"),
  })
  .transform((data) => ({
    username: (data.username || data.id || "").trim(),
    password: data.password,
  }))
  .pipe(
    z.object({
      username: z.string().min(1, "Inserisci l'utente"),
      password: z.string().min(1, "Inserisci la password"),
    }),
  );

export const crmNotifySchema = z.object({
  template: z.enum(["reminder", "promo", "followup"]),
  to: z.string().trim().email("Email non valida").optional(),
  firstName: z.string().trim().max(80).optional(),
  appointmentId: z.string().uuid().optional(),
  dateLabel: z.string().trim().max(80).optional(),
  timeLabel: z.string().trim().max(40).optional(),
  serviceNames: z.string().trim().max(200).optional(),
  barberName: z.string().trim().max(80).optional(),
});

export const walkInSchema = z.object({
  serviceIds: z.array(z.string().min(1)).min(1, "Seleziona almeno un servizio"),
  barberId: z.string().min(1, "Seleziona un barbiere"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida"),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Orario non valido")
    .transform((value) => value.slice(0, 5)),
  firstName: z.string().trim().max(80).optional().default("Walk-in"),
  lastName: z.string().trim().max(80).optional().default(""),
  phone: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
  priceEuro: z.number().min(0).max(500),
  notes: z.string().trim().max(500).optional(),
});

export const adminAppointmentsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const cancelTokenSchema = z.object({
  token: z.string().min(16, "Token non valido"),
});

export function assertKnownBookingRefs(input: {
  serviceIds: string[];
  barberId: string;
}): { ok: true } | { ok: false; message: string } {
  if (!resolveServices(input.serviceIds)) {
    return { ok: false, message: "Uno o più servizi non sono validi." };
  }
  const barber = getBarber(input.barberId);
  if (!barber && input.barberId !== ANYONE_BARBER_ID) {
    return { ok: false, message: "Barbiere non valido." };
  }
  return { ok: true };
}

export function flattenZodError(error: z.ZodError): string {
  return error.issues.map((i) => i.message).join(" ");
}
