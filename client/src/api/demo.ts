// In-memory mock backend for the static live demo (enabled with VITE_DEMO=1).
// It mirrors the real API's routes and shapes so the whole ClinicFlow UI —
// multi-role auth, per-clinic data isolation, patients, the appointment status
// lifecycle, records, prescriptions and PDF export — works with no server and
// no database. It is NOT security and never runs in the real app: "passwords"
// are compared in plain text and all data lives in memory (resets on reload).
// The real implementation is the Express + Prisma + PostgreSQL API in server/.

import { ApiError } from "./client";
import type {
  Appointment,
  AppointmentStatus,
  AuthUser,
  MedicalRecord,
  Paginated,
  Patient,
  Prescription,
  Role,
} from "./types";

// ---- internal records ---------------------------------------------------

interface DUser extends AuthUser {
  password: string;
  patientId?: string;
}
interface DDoctor {
  id: string;
  clinicId: string;
  name: string;
}
interface DPatient extends Patient {
  clinicId: string;
}
interface DAppointment {
  id: string;
  clinicId: string;
  scheduledAt: string;
  durationMin: number;
  status: AppointmentStatus;
  reason?: string | null;
  patientId: string;
  doctorId: string;
}
interface DRecord {
  id: string;
  clinicId: string;
  visitDate: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  vitals?: Record<string, string | number> | null;
  notes?: string | null;
  patientId: string;
  doctorId: string;
}
interface DRxItem {
  id: string;
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
}
interface DPrescription {
  id: string;
  clinicId: string;
  issuedAt: string;
  status: string;
  notes?: string | null;
  items: DRxItem[];
  patientId: string;
  doctorId: string;
}

let seq = 0;
const uid = (p: string) => `${p}-${(++seq).toString().padStart(4, "0")}`;
const now = Date.now();
const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString();
const HOUR = 3_600_000;
const DAY = 86_400_000;
const delay = (ms = 220) => new Promise((r) => setTimeout(r, ms));

const CLINICS: Record<string, string> = {
  "c-sunrise": "Sunrise Family Clinic",
  "c-downtown": "Downtown Medical Center",
};

// ---- seed users (all password: Passw0rd!) -------------------------------

const PW = "Passw0rd!";
const users: DUser[] = [
  { id: "u-super", email: "superadmin@clinicflow.dev", name: "Platform Owner", role: "SUPER_ADMIN", clinicId: null, password: PW },
  { id: "u-admin-s", email: "admin@sunrise.dev", name: "Sarah Ahmed", role: "CLINIC_ADMIN", clinicId: "c-sunrise", password: PW },
  { id: "u-doc-s", email: "dr.smith@sunrise.dev", name: "Dr. John Smith", role: "DOCTOR", clinicId: "c-sunrise", password: PW },
  { id: "u-recep-s", email: "reception@sunrise.dev", name: "Reception Desk", role: "STAFF", clinicId: "c-sunrise", password: PW },
  { id: "u-pat-s", email: "patient@sunrise.dev", name: "Ali Raza", role: "PATIENT", clinicId: "c-sunrise", password: PW, patientId: "p-0001" },
  { id: "u-admin-d", email: "admin@downtown.dev", name: "Dana White", role: "CLINIC_ADMIN", clinicId: "c-downtown", password: PW },
];

const doctors: DDoctor[] = [
  { id: "u-doc-s", clinicId: "c-sunrise", name: "Dr. John Smith" },
  { id: "d-khan", clinicId: "c-sunrise", name: "Dr. Ayesha Khan" },
  { id: "d-jones", clinicId: "c-downtown", name: "Dr. Emily Jones" },
];

// ---- seed patients ------------------------------------------------------

function mkPatient(
  id: string,
  clinicId: string,
  mrn: string,
  firstName: string,
  lastName: string,
  gender: string,
  phone: string,
  bloodGroup: string,
  daysAgo: number,
): DPatient {
  return {
    id,
    clinicId,
    mrn,
    firstName,
    lastName,
    gender,
    phone,
    email: null,
    bloodGroup,
    isActive: true,
    createdAt: iso(-daysAgo * DAY),
  };
}

const patients: DPatient[] = [
  mkPatient("p-0001", "c-sunrise", "SUN-0001", "Ali", "Raza", "MALE", "0300-1112233", "O+", 210),
  mkPatient("p-0002", "c-sunrise", "SUN-0002", "Fatima", "Noor", "FEMALE", "0301-2223344", "A+", 180),
  mkPatient("p-0003", "c-sunrise", "SUN-0003", "Hassan", "Iqbal", "MALE", "0302-3334455", "B+", 150),
  mkPatient("p-0004", "c-sunrise", "SUN-0004", "Ayesha", "Siddiqui", "FEMALE", "0303-4445566", "AB+", 120),
  mkPatient("p-0005", "c-sunrise", "SUN-0005", "Bilal", "Ahmed", "MALE", "0304-5556677", "O-", 90),
  mkPatient("p-0006", "c-sunrise", "SUN-0006", "Sana", "Malik", "FEMALE", "0305-6667788", "A-", 60),
  mkPatient("p-0007", "c-sunrise", "SUN-0007", "Usman", "Tariq", "MALE", "0306-7778899", "B-", 30),
  mkPatient("p-0008", "c-sunrise", "SUN-0008", "Hira", "Yousaf", "FEMALE", "0307-8889900", "O+", 12),
  mkPatient("p-1001", "c-downtown", "DTN-0001", "Michael", "Brown", "MALE", "0311-1212121", "A+", 100),
  mkPatient("p-1002", "c-downtown", "DTN-0002", "Laura", "Green", "FEMALE", "0312-1313131", "O+", 70),
];

// ---- seed appointments (mixed statuses through the lifecycle) ------------

const appointments: DAppointment[] = [
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(2 * HOUR), durationMin: 30, status: "SCHEDULED", reason: "Follow-up: hypertension", patientId: "p-0002", doctorId: "u-doc-s" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(4 * HOUR), durationMin: 20, status: "CONFIRMED", reason: "Fever & sore throat", patientId: "p-0003", doctorId: "d-khan" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(-1 * HOUR), durationMin: 30, status: "CHECKED_IN", reason: "Diabetes review", patientId: "p-0001", doctorId: "u-doc-s" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(-1 * DAY), durationMin: 30, status: "COMPLETED", reason: "Annual check-up", patientId: "p-0004", doctorId: "u-doc-s" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(-2 * DAY), durationMin: 20, status: "COMPLETED", reason: "Skin rash", patientId: "p-0006", doctorId: "d-khan" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(-3 * DAY), durationMin: 30, status: "CANCELLED", reason: "Back pain", patientId: "p-0005", doctorId: "u-doc-s" },
  { id: uid("a"), clinicId: "c-sunrise", scheduledAt: iso(26 * HOUR), durationMin: 30, status: "SCHEDULED", reason: "Vaccination", patientId: "p-0008", doctorId: "d-khan" },
  { id: uid("a"), clinicId: "c-downtown", scheduledAt: iso(3 * HOUR), durationMin: 30, status: "CONFIRMED", reason: "Consultation", patientId: "p-1001", doctorId: "d-jones" },
];

// ---- seed records + prescriptions ---------------------------------------

const records: DRecord[] = [
  { id: uid("r"), clinicId: "c-sunrise", visitDate: iso(-1 * DAY), chiefComplaint: "Routine check-up", diagnosis: "Healthy", vitals: { bp: "120/80", hr: 72, tempC: 36.7 }, notes: "Advised annual bloodwork.", patientId: "p-0004", doctorId: "u-doc-s" },
  { id: uid("r"), clinicId: "c-sunrise", visitDate: iso(-2 * DAY), chiefComplaint: "Itchy rash on forearm", diagnosis: "Contact dermatitis", vitals: { bp: "118/76", hr: 80, tempC: 36.9 }, notes: "Topical steroid prescribed.", patientId: "p-0006", doctorId: "d-khan" },
  { id: uid("r"), clinicId: "c-sunrise", visitDate: iso(-5 * DAY), chiefComplaint: "Elevated blood sugar", diagnosis: "Type 2 diabetes (controlled)", vitals: { bp: "130/85", hr: 78, tempC: 36.8 }, notes: "Continue metformin; review in 3 months.", patientId: "p-0001", doctorId: "u-doc-s" },
  { id: uid("r"), clinicId: "c-sunrise", visitDate: iso(-9 * DAY), chiefComplaint: "Persistent cough", diagnosis: "Acute bronchitis", vitals: { bp: "122/79", hr: 88, tempC: 37.6 }, notes: "Rest, fluids, antibiotics.", patientId: "p-0003", doctorId: "d-khan" },
];

const prescriptions: DPrescription[] = [
  {
    id: uid("rx"), clinicId: "c-sunrise", issuedAt: iso(-1 * DAY), status: "ISSUED", notes: "Take after meals.",
    items: [
      { id: uid("it"), drugName: "Metformin", dosage: "500mg", frequency: "Twice daily", durationDays: 90, instructions: "After breakfast and dinner" },
      { id: uid("it"), drugName: "Atorvastatin", dosage: "10mg", frequency: "Once at night", durationDays: 90, instructions: null },
    ],
    patientId: "p-0001", doctorId: "u-doc-s",
  },
  {
    id: uid("rx"), clinicId: "c-sunrise", issuedAt: iso(-2 * DAY), status: "ISSUED", notes: null,
    items: [{ id: uid("it"), drugName: "Hydrocortisone cream", dosage: "1%", frequency: "Twice daily", durationDays: 7, instructions: "Apply thin layer" }],
    patientId: "p-0006", doctorId: "d-khan",
  },
  {
    id: uid("rx"), clinicId: "c-sunrise", issuedAt: iso(-9 * DAY), status: "ISSUED", notes: "Complete the full course.",
    items: [
      { id: uid("it"), drugName: "Amoxicillin", dosage: "500mg", frequency: "Three times daily", durationDays: 5, instructions: null },
      { id: uid("it"), drugName: "Paracetamol", dosage: "500mg", frequency: "As needed", durationDays: 5, instructions: "Max 4/day" },
    ],
    patientId: "p-0003", doctorId: "u-doc-s",
  },
];

// ---- session ------------------------------------------------------------

const SESSION_KEY = "clinicflow_demo_user";
function saveSession(id: string) {
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {
    /* storage blocked */
  }
}
function currentUser(): DUser | null {
  try {
    const id = localStorage.getItem(SESSION_KEY);
    return id ? users.find((u) => u.id === id) ?? null : null;
  } catch {
    return null;
  }
}
function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
function requireUser(): DUser {
  const u = currentUser();
  if (!u) throw new ApiError(401, "Not authenticated");
  return u;
}
function toAuthUser(u: DUser): AuthUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, clinicId: u.clinicId };
}

/** `?demo_as=admin|doctor|reception|patient|super` pre-seeds a session. */
export function seedSessionFromQuery() {
  try {
    const as = new URLSearchParams(window.location.search).get("demo_as");
    const map: Record<string, string> = {
      admin: "u-admin-s",
      doctor: "u-doc-s",
      reception: "u-recep-s",
      patient: "u-pat-s",
      super: "u-super",
    };
    if (as && map[as]) saveSession(map[as]);
  } catch {
    /* ignore */
  }
}

// ---- scoping helpers ----------------------------------------------------

/** Which clinics can this user see? SUPER_ADMIN sees all; others just theirs. */
function clinicScope(u: DUser): string[] | null {
  if (u.role === "SUPER_ADMIN") return null; // null = all clinics
  return u.clinicId ? [u.clinicId] : [];
}
function inScope(clinicId: string, scope: string[] | null): boolean {
  return scope === null || scope.includes(clinicId);
}
/** Patients see only their own rows. */
function ownPatientOnly(u: DUser): string | null {
  return u.role === "PATIENT" ? u.patientId ?? "__none__" : null;
}

const doctorName = (id: string) => doctors.find((d) => d.id === id)?.name ?? "Unknown";
function patientRef(id: string) {
  const p = patients.find((x) => x.id === id);
  return p ? { id: p.id, firstName: p.firstName, lastName: p.lastName, mrn: p.mrn } : undefined;
}

function paginate<T>(items: T[], query: URLSearchParams): Paginated<T> {
  const page = Math.max(1, Number(query.get("page") || 1));
  const pageSize = Math.max(1, Number(query.get("pageSize") || 20));
  const start = (page - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize };
}

// ---- serializers --------------------------------------------------------

const serializeAppointment = (a: DAppointment): Appointment => ({
  id: a.id,
  scheduledAt: a.scheduledAt,
  durationMin: a.durationMin,
  status: a.status,
  reason: a.reason,
  patient: patientRef(a.patientId),
  doctor: { id: a.doctorId, name: doctorName(a.doctorId) },
});
const serializeRecord = (r: DRecord): MedicalRecord => ({
  id: r.id,
  visitDate: r.visitDate,
  chiefComplaint: r.chiefComplaint,
  diagnosis: r.diagnosis,
  vitals: r.vitals,
  notes: r.notes,
  patient: patientRef(r.patientId),
  doctor: { id: r.doctorId, name: doctorName(r.doctorId) },
});
const serializePrescription = (p: DPrescription): Prescription => ({
  id: p.id,
  issuedAt: p.issuedAt,
  status: p.status,
  notes: p.notes,
  items: p.items,
  patient: patientRef(p.patientId),
  doctor: { id: p.doctorId, name: doctorName(p.doctorId) },
});

// ---- appointment lifecycle ----------------------------------------------

const NEXT: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CONFIRMED: ["CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

function requireRole(u: DUser, allowed: Role[]) {
  if (!allowed.includes(u.role)) throw new ApiError(403, "You don't have permission to do that");
}

// ---- write handlers -----------------------------------------------------

function createPatient(u: DUser, body: Record<string, unknown>): { patient: Patient } {
  requireRole(u, ["CLINIC_ADMIN", "DOCTOR", "STAFF"]);
  const clinicId = u.clinicId ?? "c-sunrise";
  const first = String(body.firstName || "").trim();
  const last = String(body.lastName || "").trim();
  if (!first || !last) throw new ApiError(400, "First and last name are required");
  const n = patients.filter((p) => p.clinicId === clinicId).length + 1;
  const prefix = clinicId === "c-downtown" ? "DTN" : "SUN";
  const p: DPatient = {
    id: uid("p"),
    clinicId,
    mrn: `${prefix}-${String(n).padStart(4, "0")}`,
    firstName: first,
    lastName: last,
    gender: (body.gender as string) || "OTHER",
    phone: (body.phone as string) || null,
    email: null,
    bloodGroup: null,
    isActive: true,
    createdAt: new Date().toISOString(),
  };
  patients.unshift(p);
  return { patient: p };
}

function createRecord(u: DUser, body: Record<string, unknown>) {
  requireRole(u, ["DOCTOR"]);
  const patientId = String(body.patientId || "");
  if (!patients.some((p) => p.id === patientId)) throw new ApiError(400, "Select a patient");
  const r: DRecord = {
    id: uid("r"),
    clinicId: u.clinicId ?? "c-sunrise",
    visitDate: new Date().toISOString(),
    chiefComplaint: (body.chiefComplaint as string) ?? null,
    diagnosis: (body.diagnosis as string) ?? null,
    vitals: (body.vitals as Record<string, string | number>) ?? null,
    notes: (body.notes as string) ?? null,
    patientId,
    doctorId: u.id,
  };
  records.unshift(r);
  return { record: serializeRecord(r) };
}

function createPrescription(u: DUser, body: Record<string, unknown>) {
  requireRole(u, ["DOCTOR"]);
  const patientId = String(body.patientId || "");
  if (!patients.some((p) => p.id === patientId)) throw new ApiError(400, "Select a patient");
  const rawItems = Array.isArray(body.items) ? (body.items as Record<string, unknown>[]) : [];
  const items: DRxItem[] = rawItems
    .filter((it) => String(it.drugName || "").trim())
    .map((it) => ({
      id: uid("it"),
      drugName: String(it.drugName),
      dosage: (it.dosage as string) ?? null,
      frequency: (it.frequency as string) ?? null,
      durationDays: it.durationDays != null ? Number(it.durationDays) : null,
      instructions: (it.instructions as string) ?? null,
    }));
  if (items.length === 0) throw new ApiError(400, "Add at least one medication");
  const rx: DPrescription = {
    id: uid("rx"),
    clinicId: u.clinicId ?? "c-sunrise",
    issuedAt: new Date().toISOString(),
    status: "ISSUED",
    notes: (body.notes as string) ?? null,
    items,
    patientId,
    doctorId: u.id,
  };
  prescriptions.unshift(rx);
  return { prescription: serializePrescription(rx) };
}

function setAppointmentStatus(u: DUser, id: string, status: AppointmentStatus) {
  requireRole(u, ["CLINIC_ADMIN", "DOCTOR", "STAFF"]);
  const appt = appointments.find((a) => a.id === id && inScope(a.clinicId, clinicScope(u)));
  if (!appt) throw new ApiError(404, "Appointment not found");
  if (!NEXT[appt.status].includes(status)) {
    throw new ApiError(400, `Cannot move a ${appt.status} appointment to ${status}`);
  }
  appt.status = status;
  return { appointment: serializeAppointment(appt) };
}

// ---- PDF (minimal, valid, dependency-free) ------------------------------

function buildPdf(lines: string[]): Blob {
  const esc = (s: string) => s.replace(/[\\()]/g, (c) => "\\" + c);
  let content = "BT /F1 11 Tf 56 786 Td 15 TL\n";
  lines.forEach((ln, i) => {
    const safe = esc(ln.replace(/[^\x20-\x7E]/g, "?")).slice(0, 105);
    content += (i === 0 ? `(${safe}) Tj\n` : `T* (${safe}) Tj\n`);
  });
  content += "ET";

  const objs = [
    "<</Type/Catalog/Pages 2 0 R>>",
    "<</Type/Pages/Kids[3 0 R]/Count 1>>",
    "<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>",
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objs.forEach((o, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => (pdf += String(off).padStart(10, "0") + " 00000 n \n"));
  pdf += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R>>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

function prescriptionPdf(u: DUser, id: string): Blob {
  const rx = prescriptions.find((p) => p.id === id && inScope(p.clinicId, clinicScope(u)));
  if (!rx) throw new ApiError(404, "Prescription not found");
  const p = patients.find((x) => x.id === rx.patientId);
  const lines = [
    CLINICS[rx.clinicId] ?? "ClinicFlow",
    "PRESCRIPTION",
    "",
    `Patient: ${p ? `${p.firstName} ${p.lastName}` : "-"}   MRN: ${p?.mrn ?? "-"}`,
    `Prescriber: ${doctorName(rx.doctorId)}`,
    `Issued: ${new Date(rx.issuedAt).toLocaleString()}`,
    "",
    "Medications:",
    ...rx.items.map(
      (it, i) =>
        `  ${i + 1}. ${it.drugName}  ${[it.dosage, it.frequency, it.durationDays ? `${it.durationDays} days` : null]
          .filter(Boolean)
          .join(" / ")}`,
    ),
    ...(rx.notes ? ["", `Notes: ${rx.notes}`] : []),
    "",
    "-- Generated by the ClinicFlow demo (mock data) --",
  ];
  return buildPdf(lines);
}

// ---- router -------------------------------------------------------------

export async function refresh(): Promise<boolean> {
  await delay(120);
  return currentUser() !== null;
}

export async function blob(path: string): Promise<Blob> {
  await delay(200);
  const u = requireUser();
  const m = path.match(/^\/prescriptions\/([^/]+)\/pdf$/);
  if (m) return prescriptionPdf(u, m[1]);
  throw new ApiError(404, `Not found: ${path}`);
}

export async function handle<T>(path: string, opts: { method?: string; body?: BodyInit | null }): Promise<T> {
  await delay();
  const method = (opts.method || "GET").toUpperCase();
  const [rawPath, qs = ""] = path.split("?");
  const query = new URLSearchParams(qs);
  const body: Record<string, unknown> =
    typeof opts.body === "string" && opts.body ? JSON.parse(opts.body) : {};

  // --- auth ---
  if (rawPath === "/auth/login" && method === "POST") {
    const email = String(body.email || "").trim().toLowerCase();
    const found = users.find((x) => x.email === email && x.password === body.password);
    if (!found) throw new ApiError(401, "Invalid email or password");
    saveSession(found.id);
    return { accessToken: "demo-token", user: toAuthUser(found) } as T;
  }
  if (rawPath === "/auth/logout" && method === "POST") {
    clearSession();
    return undefined as T;
  }
  if (rawPath === "/auth/me" && method === "GET") {
    return { user: toAuthUser(requireUser()) } as T;
  }

  const u = requireUser();
  const scope = clinicScope(u);
  const ownPatient = ownPatientOnly(u);

  // --- patients ---
  if (rawPath === "/patients") {
    if (method === "POST") return createPatient(u, body) as T;
    const search = (query.get("search") || "").trim().toLowerCase();
    let rows = patients.filter((p) => inScope(p.clinicId, scope));
    if (ownPatient) rows = rows.filter((p) => p.id === ownPatient);
    if (search) {
      rows = rows.filter((p) =>
        `${p.firstName} ${p.lastName} ${p.mrn} ${p.phone ?? ""}`.toLowerCase().includes(search),
      );
    }
    rows = rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return paginate<Patient>(rows, query) as T;
  }

  // --- appointments ---
  if (rawPath === "/appointments" && method === "GET") {
    let rows = appointments.filter((a) => inScope(a.clinicId, scope));
    if (ownPatient) rows = rows.filter((a) => a.patientId === ownPatient);
    rows = rows.slice().sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
    return paginate<Appointment>(rows.map(serializeAppointment), query) as T;
  }
  const apptStatus = rawPath.match(/^\/appointments\/([^/]+)\/status$/);
  if (apptStatus && method === "PATCH") {
    return setAppointmentStatus(u, apptStatus[1], body.status as AppointmentStatus) as T;
  }

  // --- records ---
  if (rawPath === "/records") {
    if (method === "POST") return createRecord(u, body) as T;
    let rows = records.filter((r) => inScope(r.clinicId, scope));
    if (ownPatient) rows = rows.filter((r) => r.patientId === ownPatient);
    rows = rows.slice().sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    return paginate<MedicalRecord>(rows.map(serializeRecord), query) as T;
  }

  // --- prescriptions ---
  if (rawPath === "/prescriptions") {
    if (method === "POST") return createPrescription(u, body) as T;
    let rows = prescriptions.filter((p) => inScope(p.clinicId, scope));
    if (ownPatient) rows = rows.filter((p) => p.patientId === ownPatient);
    rows = rows.slice().sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
    return paginate<Prescription>(rows.map(serializePrescription), query) as T;
  }

  throw new ApiError(404, `Not found: ${method} ${rawPath}`);
}
