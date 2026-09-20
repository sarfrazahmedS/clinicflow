import { z } from "zod";
import { AppointmentStatus } from "@prisma/client";

export const createAppointmentSchema = z.object({
  patientId: z.string().cuid(),
  doctorId: z.string().cuid(),
  scheduledAt: z.coerce.date(),
  durationMin: z.coerce.number().int().min(5).max(480).default(30),
  reason: z.string().max(300).optional(),
});

export const rescheduleSchema = z.object({
  scheduledAt: z.coerce.date(),
  durationMin: z.coerce.number().int().min(5).max(480).optional(),
});

export const updateStatusSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const listAppointmentsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  doctorId: z.string().cuid().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type RescheduleInput = z.infer<typeof rescheduleSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
