import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface AuthUser {
      id: string;
      role: Role;
      clinicId: string | null;
    }
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
