import type { User } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { hashPassword, verifyPassword } from "../../lib/password.js";
import { generateRefreshToken, hashRefreshToken, signAccessToken } from "../../lib/jwt.js";
import { conflict, unauthorized } from "../../lib/errors.js";
import { slugify } from "../../lib/slug.js";
import { env } from "../../env.js";
import type { LoginInput, RegisterInput } from "./auth.schemas.js";

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: User["role"];
  clinicId: string | null;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

function refreshExpiry(): Date {
  return new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function publicUser(u: User): PublicUser {
  return { id: u.id, email: u.email, name: u.name, role: u.role, clinicId: u.clinicId };
}

async function uniqueClinicSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  while (await prisma.clinic.findUnique({ where: { slug } })) {
    slug = `${base}-${n++}`;
  }
  return slug;
}

async function issueSession(user: User): Promise<Session> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role, clinicId: user.clinicId });
  const { token, hash } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash: hash, expiresAt: refreshExpiry() },
  });
  return { accessToken, refreshToken: token, user: publicUser(user) };
}

export async function registerClinic(input: RegisterInput): Promise<Session> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw conflict("Email already registered");

  const slug = await uniqueClinicSlug(input.clinicName);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const clinic = await tx.clinic.create({ data: { name: input.clinicName, slug } });
    return tx.user.create({
      data: {
        clinicId: clinic.id,
        email: input.email,
        name: input.name,
        passwordHash,
        role: "CLINIC_ADMIN",
      },
    });
  });

  return issueSession(user);
}

export async function login(input: LoginInput): Promise<Session> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) throw unauthorized("Invalid credentials");
  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized("Invalid credentials");
  return issueSession(user);
}

export async function refresh(rawToken?: string): Promise<Session> {
  if (!rawToken) throw unauthorized("Missing refresh token");
  const tokenHash = hashRefreshToken(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw unauthorized("Invalid refresh token");
  }
  // Rotate: revoke the used token, then issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
  return issueSession(stored.user);
}

export async function logout(rawToken?: string): Promise<void> {
  if (!rawToken) return;
  const tokenHash = hashRefreshToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
