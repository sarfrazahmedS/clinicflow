import { z } from "zod";

export const prescriptionItemSchema = z.object({
  drugName: z.string().min(1).max(120),
  dosage: z.string().max(60).optional(),
  frequency: z.string().max(60).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  instructions: z.string().max(200).optional(),
});

export const createPrescriptionSchema = z.object({
  patientId: z.string().cuid(),
  medicalRecordId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
  items: z.array(prescriptionItemSchema).min(1).max(20),
});

export const listPrescriptionsQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>;
