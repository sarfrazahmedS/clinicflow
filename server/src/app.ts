import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./env.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { patientsRouter } from "./modules/patients/patients.routes.js";
import { appointmentsRouter } from "./modules/appointments/appointments.routes.js";
import { recordsRouter } from "./modules/records/records.routes.js";
import { prescriptionsRouter } from "./modules/prescriptions/prescriptions.routes.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  // CSP is disabled so the bundled single-page app loads cleanly; all other
  // Helmet protections (HSTS, no-sniff, frameguard, …) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());
  app.use("/api", apiLimiter);

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/patients", patientsRouter);
  app.use("/api/appointments", appointmentsRouter);
  app.use("/api/records", recordsRouter);
  app.use("/api/prescriptions", prescriptionsRouter);

  // In production, serve the built React client from the same origin — so the
  // httpOnly refresh cookie just works without any cross-site cookie config.
  const clientDir = path.resolve(process.cwd(), env.PUBLIC_DIR);
  if (env.NODE_ENV === "production" && existsSync(clientDir)) {
    app.use(express.static(clientDir));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(clientDir, "index.html"));
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
