import { z } from "zod";

export const vitalsSchema = z
  .object({
    bp: z.string().max(20).optional(),
    hr: z.coerce.number().min(0).max(400).optional(),
    tempC: z.coerce.number().min(20).max(45).optional(),
    weightKg: z.coerce.number().min(0).max(500).optional(),
    heightCm: z.coerce.number().min(0).max(300).optional(),
  })
  .partial();

export const createRecordSchema = z.object({
  patientId: z.string().cuid(),
  appointmentId: z.string().cuid().optional(),
  chiefComplaint: z.string().max(300).optional(),
  diagnosis: z.string().max(300).optional(),
  vitals: vitalsSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export const listRecordsQuerySchema = z.object({
  patientId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateRecordInput = z.infer<typeof createRecordSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
