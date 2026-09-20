import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import { env } from "../env.js";

export interface AccessTokenPayload {
  sub: string; // userId
  role: Role;
  clinicId: string | null;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const opts: jwt.SignOptions = {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, opts);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/** Opaque refresh token — only its SHA-256 hash is ever stored. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("hex");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
