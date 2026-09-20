export type Role = "SUPER_ADMIN" | "CLINIC_ADMIN" | "DOCTOR" | "STAFF" | "PATIENT";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  clinicId: string | null;
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  gender?: string | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type AppointmentStatus =
  | "SCHEDULED"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface Appointment {
  id: string;
  scheduledAt: string;
  durationMin: number;
  status: AppointmentStatus;
  reason?: string | null;
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  doctor?: { id: string; name: string };
}

export interface Vitals {
  bp?: string;
  hr?: number;
  tempC?: number;
  weightKg?: number;
  heightCm?: number;
}

export interface MedicalRecord {
  id: string;
  visitDate: string;
  chiefComplaint?: string | null;
  diagnosis?: string | null;
  vitals?: Vitals | null;
  notes?: string | null;
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  doctor?: { id: string; name: string };
}

export interface PrescriptionItem {
  id: string;
  drugName: string;
  dosage?: string | null;
  frequency?: string | null;
  durationDays?: number | null;
  instructions?: string | null;
}

export interface Prescription {
  id: string;
  issuedAt: string;
  status: string;
  notes?: string | null;
  items: PrescriptionItem[];
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  doctor?: { id: string; name: string };
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
