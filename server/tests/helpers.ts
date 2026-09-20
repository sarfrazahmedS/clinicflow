import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";

/** Wipe the test database in FK-safe order. Guarded so it can never hit a real DB. */
export async function resetDb(prisma: PrismaClient): Promise<void> {
  if (!/test/i.test(process.env.DATABASE_URL ?? "")) {
    throw new Error("Refusing to reset a non-test database");
  }
  await prisma.auditLog.deleteMany();
  await prisma.prescriptionItem.deleteMany();
  await prisma.prescription.deleteMany();
  await prisma.medicalRecord.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinic.deleteMany();
}

/** Two clinics, each with a doctor / staff / admin / patient (+ portal login). */
export async function seedTestData(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash("Passw0rd!", 8);

  const buildClinic = async (slug: string, name: string) => {
    const clinic = await prisma.clinic.create({ data: { name, slug } });
    const doctor = await prisma.user.create({
      data: { clinicId: clinic.id, email: `doctor@${slug}.test`, name: "Dr Test", role: "DOCTOR", passwordHash },
    });
    const staff = await prisma.user.create({
      data: { clinicId: clinic.id, email: `staff@${slug}.test`, name: "Staff", role: "STAFF", passwordHash },
    });
    const admin = await prisma.user.create({
      data: { clinicId: clinic.id, email: `admin@${slug}.test`, name: "Admin", role: "CLINIC_ADMIN", passwordHash },
    });
    const patientUser = await prisma.user.create({
      data: { clinicId: clinic.id, email: `patient@${slug}.test`, name: "Pat Ient", role: "PATIENT", passwordHash },
    });
    const patient = await prisma.patient.create({
      data: { clinicId: clinic.id, mrn: `MRN-${slug}-1`, firstName: "Pat", lastName: "Ient", userId: patientUser.id },
    });
    return { clinic, doctor, staff, admin, patientUser, patient };
  };

  const a = await buildClinic("sunrisetest", "Sunrise Test");
  const b = await buildClinic("downtowntest", "Downtown Test");
  return { a, b };
}
