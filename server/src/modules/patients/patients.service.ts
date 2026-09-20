import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { tenantWhere } from "../../lib/tenant.js";
import { forbidden, notFound } from "../../lib/errors.js";
import type { Caller } from "../../lib/types.js";
import type {
  CreatePatientInput,
  ListPatientsQuery,
  UpdatePatientInput,
} from "./patients.schemas.js";

function requireClinic(caller: Caller): string {
  if (!caller.clinicId) throw forbidden("A clinic context is required to manage patients");
  return caller.clinicId;
}

function newMrn(): string {
  return `MRN-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export async function createPatient(caller: Caller, input: CreatePatientInput) {
  const clinicId = requireClinic(caller);
  // MRN is unique per clinic; retry a couple of times on the rare collision.
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.patient.create({ data: { clinicId, mrn: newMrn(), ...input } });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002" && attempt < 2) {
        continue;
      }
      throw err;
    }
  }
  throw new Error("Could not allocate a unique MRN");
}

export async function listPatients(caller: Caller, q: ListPatientsQuery) {
  const where: Prisma.PatientWhereInput = { ...tenantWhere(caller) };
  if (q.search) {
    where.OR = [
      { firstName: { contains: q.search, mode: "insensitive" } },
      { lastName: { contains: q.search, mode: "insensitive" } },
      { mrn: { contains: q.search, mode: "insensitive" } },
      { phone: { contains: q.search } },
    ];
  }
  const [total, items] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
  ]);
  return { items, total, page: q.page, pageSize: q.pageSize };
}

/** Fetch a patient, scoped to the caller's clinic (cross-tenant → 404). */
export async function getPatient(caller: Caller, id: string) {
  const patient = await prisma.patient.findFirst({ where: { id, ...tenantWhere(caller) } });
  if (!patient) throw notFound("Patient not found");
  return patient;
}

export async function updatePatient(caller: Caller, id: string, input: UpdatePatientInput) {
  await getPatient(caller, id); // enforces tenant ownership before write
  return prisma.patient.update({ where: { id }, data: input });
}

export async function deactivatePatient(caller: Caller, id: string) {
  await getPatient(caller, id);
  return prisma.patient.update({ where: { id }, data: { isActive: false } });
}
