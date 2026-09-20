import type { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (m = "Bad request", d?: unknown) => new AppError(400, m, "BAD_REQUEST", d);
export const unauthorized = (m = "Unauthorized") => new AppError(401, m, "UNAUTHORIZED");
export const forbidden = (m = "Forbidden") => new AppError(403, m, "FORBIDDEN");
export const notFound = (m = "Not found") => new AppError(404, m, "NOT_FOUND");
export const conflict = (m = "Conflict") => new AppError(409, m, "CONFLICT");

/** Wrap an async route handler so thrown errors reach the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
