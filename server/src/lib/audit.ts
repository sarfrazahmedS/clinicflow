import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";

export interface AuditInput {
  clinicId?: string | null;
  userId?: string | null;
  action: string; // e.g. "appointment.create"
  entity: string; // e.g. "Appointment"
  entityId?: string | null;
  metadata?: unknown;
  ip?: string | null;
}

/** Best-effort audit write. Never throws — auditing must not break a request. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: input.clinicId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata:
          input.metadata === undefined ? undefined : (input.metadata as Prisma.InputJsonValue),
        ip: input.ip ?? null,
      },
    });
  } catch {
    // swallow — auditing is best-effort
  }
}
