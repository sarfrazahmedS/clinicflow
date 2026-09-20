import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { tenantWhere } from "../../lib/tenant.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import type { Caller } from "../../lib/types.js";
import type { CreateRecordInput, ListRecordsQuery } from "./records.schemas.js";

function requireClinic(caller: Caller): string {
  if (!caller.clinicId) throw forbidden("A clinic context is required");
  return caller.clinicId;
}

/** Scope records to the caller's clinic; a PATIENT only sees their own. */
function scopeFor(caller: Caller): Prisma.MedicalRecordWhereInput {
  const base: Prisma.MedicalRecordWhereInput = { ...tenantWhere(caller) };
  if (caller.role === "PATIENT") base.patient = { userId: caller.id };
  return base;
}

export async function createRecord(caller: Caller, input: CreateRecordInput) {
  const clinicId = requireClinic(caller);
  if (caller.role !== "DOCTOR") throw forbidden("Only a doctor can write medical records");

  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, clinicId } });
  if (!patient) throw notFound("Patient not found in this clinic");

  if (input.appointmentId) {
    const appt = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, clinicId, patientId: input.patientId },
    });
    if (!appt) throw badRequest("Invalid appointment for this patient");
  }

  return prisma.medicalRecord.create({
    data: {
      clinicId,
      patientId: input.patientId,
      doctorId: caller.id,
      appointmentId: input.appointmentId ?? null,
      chiefComplaint: input.chiefComplaint ?? null,
      diagnosis: input.diagnosis ?? null,
      vitals: input.vitals ? (input.vitals as Prisma.InputJsonValue) : undefined,
      notes: input.notes ?? null,
    },
  });
}

export async function listRecords(caller: Caller, q: ListRecordsQuery) {
  const where = scopeFor(caller);
  if (q.patientId) where.patientId = q.patientId;
  const [total, items] = await prisma.$transaction([
    prisma.medicalRecord.count({ where }),
    prisma.medicalRecord.findMany({
      where,
      orderBy: { visitDate: "desc" },
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

export async function getRecord(caller: Caller, id: string) {
  const record = await prisma.medicalRecord.findFirst({
    where: { id, ...scopeFor(caller) },
    include: { patient: true, doctor: true, prescriptions: { include: { items: true } } },
  });
  if (!record) throw notFound("Record not found");
  return record;
}
