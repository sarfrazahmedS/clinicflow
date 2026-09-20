import type { Role } from "@prisma/client";
import { forbidden } from "./errors.js";

/**
 * Prisma `where` fragment that scopes a query to the caller's clinic.
 * SUPER_ADMIN gets an empty scope (all clinics); everyone else is pinned to
 * their own clinicId — the value comes from the verified JWT, never the client.
 */
export function tenantWhere(user: { role: Role; clinicId: string | null }): { clinicId?: string } {
  if (user.role === "SUPER_ADMIN") return {};
  if (!user.clinicId) throw forbidden("No clinic context");
  return { clinicId: user.clinicId };
}
