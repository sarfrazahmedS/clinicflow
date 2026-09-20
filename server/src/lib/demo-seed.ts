import { AppointmentStatus, Gender, PrescriptionStatus, type PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Every demo account uses the same password for convenience.
export const DEMO_PASSWORD = "Passw0rd!";

const day = 24 * 60 * 60 * 1000;
const at = (offsetDays: number, hour: number) => {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return new Date(d.getTime() + offsetDays * day);
};

interface SamplePatient {
  firstName: string;
  lastName: string;
  gender: Gender;
  dob: string;
  phone: string;
  bloodGroup: string;
  allergies?: string;
}

const SAMPLE_PATIENTS: SamplePatient[] = [
  { firstName: "Ayesha", lastName: "Malik", gender: Gender.FEMALE, dob: "1990-04-12", phone: "+1 555 0201", bloodGroup: "O+" },
  { firstName: "Daniel", lastName: "Reed", gender: Gender.MALE, dob: "1985-11-03", phone: "+1 555 0202", bloodGroup: "A+", allergies: "Penicillin" },
  { firstName: "Fatima", lastName: "Noor", gender: Gender.FEMALE, dob: "2001-07-21", phone: "+1 555 0203", bloodGroup: "B-" },
  { firstName: "George", lastName: "Osei", gender: Gender.MALE, dob: "1978-01-30", phone: "+1 555 0204", bloodGroup: "AB+" },
];

async function resetDatabase(prisma: PrismaClient) {
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

async function buildClinic(
  prisma: PrismaClient,
  opts: { name: string; slug: string; brandColor: string; passwordHash: string },
) {
  const { name, slug, brandColor, passwordHash } = opts;

  const clinic = await prisma.clinic.create({
    data: { name, slug, brandColor, email: `hello@${slug}.dev`, phone: "+1 555 0100", address: "123 Health Street, Suite 200" },
  });

  await prisma.user.create({ data: { clinicId: clinic.id, email: `admin@${slug}.dev`, name: `${name} Admin`, role: Role.CLINIC_ADMIN, passwordHash } });
  const drSmith = await prisma.user.create({ data: { clinicId: clinic.id, email: `dr.smith@${slug}.dev`, name: "Dr. Sarah Smith", role: Role.DOCTOR, specialty: "General Medicine", licenseNo: "LIC-1001", passwordHash } });
  const drKhan = await prisma.user.create({ data: { clinicId: clinic.id, email: `dr.khan@${slug}.dev`, name: "Dr. Imran Khan", role: Role.DOCTOR, specialty: "Cardiology", licenseNo: "LIC-1002", passwordHash } });
  await prisma.user.create({ data: { clinicId: clinic.id, email: `reception@${slug}.dev`, name: `${name} Reception`, role: Role.STAFF, passwordHash } });

  const patients = [];
  for (let i = 0; i < SAMPLE_PATIENTS.length; i++) {
    const p = SAMPLE_PATIENTS[i]!;
    patients.push(
      await prisma.patient.create({
        data: {
          clinicId: clinic.id,
          mrn: `MRN-${slug.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(4, "0")}`,
          firstName: p.firstName,
          lastName: p.lastName,
          gender: p.gender,
          dob: new Date(p.dob),
          phone: p.phone,
          email: `${p.firstName.toLowerCase()}.${p.lastName.toLowerCase()}@example.com`,
          bloodGroup: p.bloodGroup,
          allergies: p.allergies ?? null,
        },
      }),
    );
  }

  const portalPatient = patients[0]!;
  const portalUser = await prisma.user.create({
    data: { clinicId: clinic.id, email: `patient@${slug}.dev`, name: `${portalPatient.firstName} ${portalPatient.lastName}`, role: Role.PATIENT, passwordHash },
  });
  await prisma.patient.update({ where: { id: portalPatient.id }, data: { userId: portalUser.id } });

  const completed = await prisma.appointment.create({
    data: { clinicId: clinic.id, patientId: patients[0]!.id, doctorId: drSmith.id, scheduledAt: at(-3, 10), durationMin: 30, status: AppointmentStatus.COMPLETED, reason: "Fever and sore throat" },
  });
  const record = await prisma.medicalRecord.create({
    data: {
      clinicId: clinic.id,
      patientId: patients[0]!.id,
      doctorId: drSmith.id,
      appointmentId: completed.id,
      visitDate: at(-3, 10),
      chiefComplaint: "Fever, sore throat for 3 days",
      diagnosis: "Acute pharyngitis",
      vitals: { bp: "118/76", hr: 78, tempC: 38.1, weightKg: 63 },
      notes: "Advised rest and fluids. Review in one week if not improving.",
    },
  });
  await prisma.prescription.create({
    data: {
      clinicId: clinic.id,
      patientId: patients[0]!.id,
      doctorId: drSmith.id,
      medicalRecordId: record.id,
      status: PrescriptionStatus.ACTIVE,
      issuedAt: at(-3, 10),
      notes: "Take after meals.",
      items: {
        create: [
          { drugName: "Amoxicillin 500mg", dosage: "1 capsule", frequency: "3x/day", durationDays: 5, instructions: "After food" },
          { drugName: "Paracetamol 500mg", dosage: "1 tablet", frequency: "as needed", durationDays: 3, instructions: "For fever" },
        ],
      },
    },
  });

  await prisma.appointment.createMany({
    data: [
      { clinicId: clinic.id, patientId: patients[1]!.id, doctorId: drSmith.id, scheduledAt: at(1, 9), durationMin: 30, status: AppointmentStatus.SCHEDULED, reason: "Follow-up" },
      { clinicId: clinic.id, patientId: patients[2]!.id, doctorId: drKhan.id, scheduledAt: at(1, 11), durationMin: 45, status: AppointmentStatus.CONFIRMED, reason: "Chest pain evaluation" },
      { clinicId: clinic.id, patientId: patients[3]!.id, doctorId: drKhan.id, scheduledAt: at(2, 14), durationMin: 30, status: AppointmentStatus.SCHEDULED, reason: "Routine checkup" },
    ],
  });
}

/** Wipe and populate the database with two demo clinics and their data. */
export async function seedDemo(prisma: PrismaClient): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await resetDatabase(prisma);
  await prisma.user.create({
    data: { email: "superadmin@clinicflow.dev", name: "Platform Admin", role: Role.SUPER_ADMIN, passwordHash, clinicId: null },
  });
  await buildClinic(prisma, { name: "Sunrise Medical Center", slug: "sunrise", brandColor: "#2563eb", passwordHash });
  await buildClinic(prisma, { name: "Downtown Family Clinic", slug: "downtown", brandColor: "#059669", passwordHash });
}
