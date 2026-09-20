import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(7),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  STORAGE_DIR: z.string().default("storage"),
  // In production the server serves the built client from this directory.
  PUBLIC_DIR: z.string().default("public"),
});

export const env = schema.parse(process.env);
export const isProd = env.NODE_ENV === "production";
