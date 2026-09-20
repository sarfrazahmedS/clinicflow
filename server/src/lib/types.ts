import type { Role } from "@prisma/client";

/** The authenticated caller, derived from the verified access token. */
export interface Caller {
  id: string;
  role: Role;
  clinicId: string | null;
}
