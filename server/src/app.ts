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
  app.use(helmet());
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

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
