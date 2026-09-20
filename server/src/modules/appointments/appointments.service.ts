import { Prisma, type AppointmentStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { tenantWhere } from "../../lib/tenant.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/errors.js";
import type { Caller } from "../../lib/types.js";
import type {
  CreateAppointmentInput,
  ListAppointmentsQuery,
  RescheduleInput,
} from "./appointments.schemas.js";

/** Allowed status transitions — anything else is rejected. */
const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

const CLOSED: AppointmentStatus[] = ["COMPLETED", "CANCELLED", "NO_SHOW"];

function requireClinic(caller: Caller): string {
  if (!caller.clinicId) throw forbidden("A clinic context is required to manage appointments");
  return caller.clinicId;
}

async function assertPatientInClinic(clinicId: string, patientId: string) {
  const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
  if (!patient) throw notFound("Patient not found in this clinic");
}

async function assertDoctorInClinic(clinicId: string, doctorId: string) {
  const doctor = await prisma.user.findFirst({
    where: { id: doctorId, clinicId, role: "DOCTOR", isActive: true },
  });
  if (!doctor) throw notFound("Doctor not found in this clinic");
}

/** Reject a booking that overlaps another active appointment for the same doctor. */
async function assertNoConflict(
  clinicId: string,
  doctorId: string,
  start: Date,
  durationMin: number,
  excludeId?: string,
) {
  const end = new Date(start.getTime() + durationMin * 60_000);
  const windowStart = new Date(start.getTime() - 8 * 60 * 60_000); // max duration is 8h
  const candidates = await prisma.appointment.findMany({
    where: {
      clinicId,
      doctorId,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      scheduledAt: { gte: windowStart, lte: end },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { scheduledAt: true, durationMin: true },
  });
  const clash = candidates.some((a) => {
    const aStart = a.scheduledAt.getTime();
    const aEnd = aStart + a.durationMin * 60_000;
    return aStart < end.getTime() && aEnd > start.getTime();
  });
  if (clash) throw conflict("The doctor already has an appointment in this time slot");
}

export async function createAppointment(caller: Caller, input: CreateAppointmentInput) {
  const clinicId = requireClinic(caller);
  await assertPatientInClinic(clinicId, input.patientId);
  await assertDoctorInClinic(clinicId, input.doctorId);
  await assertNoConflict(clinicId, input.doctorId, input.scheduledAt, input.durationMin);
  return prisma.appointment.create({
    data: {
      clinicId,
      patientId: input.patientId,
      doctorId: input.doctorId,
      scheduledAt: input.scheduledAt,
      durationMin: input.durationMin,
      reason: input.reason ?? null,
      createdById: caller.id,
    },
  });
}

export async function listAppointments(caller: Caller, q: ListAppointmentsQuery) {
  const where: Prisma.AppointmentWhereInput = { ...tenantWhere(caller) };
  if (q.doctorId) where.doctorId = q.doctorId;
  if (q.status) where.status = q.status;
  if (q.from || q.to) {
    where.scheduledAt = {
      ...(q.from ? { gte: q.from } : {}),
      ...(q.to ? { lte: q.to } : {}),
    };
  }
  const [total, items] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: "asc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function getAppointment(caller: Caller, id: string) {
  const appointment = await prisma.appointment.findFirst({ where: { id, ...tenantWhere(caller) } });
  if (!appointment) throw notFound("Appointment not found");
  return appointment;
}

export async function updateStatus(caller: Caller, id: string, status: AppointmentStatus) {
  const appointment = await getAppointment(caller, id);
  const allowed = TRANSITIONS[appointment.status];
  if (!allowed.includes(status)) {
    throw badRequest(`Invalid status change: ${appointment.status} → ${status}`);
  }
  return prisma.appointment.update({ where: { id }, data: { status } });
}

export async function reschedule(caller: Caller, id: string, input: RescheduleInput) {
  const appointment = await getAppointment(caller, id);
  if (CLOSED.includes(appointment.status)) {
    throw badRequest(`Cannot reschedule a ${appointment.status.toLowerCase()} appointment`);
  }
  const durationMin = input.durationMin ?? appointment.durationMin;
  await assertNoConflict(appointment.clinicId, appointment.doctorId, input.scheduledAt, durationMin, appointment.id);
  return prisma.appointment.update({
    where: { id },
    data: { scheduledAt: input.scheduledAt, durationMin },
  });
}
