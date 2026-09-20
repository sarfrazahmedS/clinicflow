import type { CookieOptions, Request, Response } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { audit } from "../../lib/audit.js";
import { env } from "../../env.js";
import * as authService from "./auth.service.js";

const REFRESH_COOKIE = "cf_refresh";

const cookieOpts: CookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: env.NODE_ENV === "production",
  path: "/api/auth",
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.registerClinic(req.body);
  await audit({
    clinicId: session.user.clinicId,
    userId: session.user.id,
    action: "auth.register",
    entity: "User",
    entityId: session.user.id,
    ip: req.ip,
  });
  res.cookie(REFRESH_COOKIE, session.refreshToken, cookieOpts);
  res.status(201).json({ accessToken: session.accessToken, user: session.user });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.login(req.body);
  await audit({
    clinicId: session.user.clinicId,
    userId: session.user.id,
    action: "auth.login",
    entity: "User",
    entityId: session.user.id,
    ip: req.ip,
  });
  res.cookie(REFRESH_COOKIE, session.refreshToken, cookieOpts);
  res.json({ accessToken: session.accessToken, user: session.user });
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const session = await authService.refresh(req.cookies?.[REFRESH_COOKIE]);
  res.cookie(REFRESH_COOKIE, session.refreshToken, cookieOpts);
  res.json({ accessToken: session.accessToken, user: session.user });
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, { ...cookieOpts, maxAge: undefined });
  res.status(204).end();
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, clinicId: true },
  });
  res.json({ user });
});
