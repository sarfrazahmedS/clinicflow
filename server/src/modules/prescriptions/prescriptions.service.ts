import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { tenantWhere } from "../../lib/tenant.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import type { Caller } from "../../lib/types.js";
import type { CreatePrescriptionInput, ListPrescriptionsQuery } from "./prescriptions.schemas.js";

function requireClinic(caller: Caller): string {
  if (!caller.clinicId) throw forbidden("A clinic context is required");
  return caller.clinicId;
}

/** Scope prescriptions to the clinic; a PATIENT only sees their own. */
function scopeFor(caller: Caller): Prisma.PrescriptionWhereInput {
  const base: Prisma.PrescriptionWhereInput = { ...tenantWhere(caller) };
  if (caller.role === "PATIENT") base.patient = { userId: caller.id };
  return base;
}

export async function createPrescription(caller: Caller, input: CreatePrescriptionInput) {
  const clinicId = requireClinic(caller);

  const patient = await prisma.patient.findFirst({ where: { id: input.patientId, clinicId } });
  if (!patient) throw notFound("Patient not found in this clinic");

  if (input.medicalRecordId) {
    const record = await prisma.medicalRecord.findFirst({
      where: { id: input.medicalRecordId, clinicId, patientId: input.patientId },
    });
    if (!record) throw badRequest("Invalid medical record for this patient");
  }

  return prisma.prescription.create({
    data: {
      clinicId,
      patientId: input.patientId,
      doctorId: caller.id,
      medicalRecordId: input.medicalRecordId ?? null,
      notes: input.notes ?? null,
      items: { create: input.items },
    },
    include: { items: true },
  });
}

export async function listPrescriptions(caller: Caller, q: ListPrescriptionsQuery) {
  const where = scopeFor(caller);
  if (q.patientId) where.patientId = q.patientId;
  const [total, items] = await prisma.$transaction([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({
      where,
      orderBy: { issuedAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
      include: {
        items: true,
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
        doctor: { select: { id: true, name: true } },
      },
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

export async function getPrescription(caller: Caller, id: string) {
  const prescription = await prisma.prescription.findFirst({
    where: { id, ...scopeFor(caller) },
    include: { items: true, patient: true, doctor: true },
  });
  if (!prescription) throw notFound("Prescription not found");
  return prescription;
}

/** Full record incl. clinic branding — used to render the PDF. */
export async function getPrescriptionForPdf(caller: Caller, id: string) {
  const prescription = await prisma.prescription.findFirst({
    where: { id, ...scopeFor(caller) },
    include: { items: true, patient: true, doctor: true, clinic: true },
  });
  if (!prescription) throw notFound("Prescription not found");
  return prescription;
}
