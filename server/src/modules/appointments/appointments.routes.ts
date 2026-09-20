import { Router } from "express";
import type { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  rescheduleSchema,
  updateStatusSchema,
} from "./appointments.schemas.js";
import * as controller from "./appointments.controller.js";

export const appointmentsRouter = Router();
appointmentsRouter.use(authenticate);

const READERS: Role[] = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "STAFF"];
const SCHEDULERS: Role[] = ["CLINIC_ADMIN", "DOCTOR", "STAFF"];

appointmentsRouter.get("/", requireRole(...READERS), validate(listAppointmentsQuerySchema, "query"), controller.list);
appointmentsRouter.post("/", requireRole(...SCHEDULERS), validate(createAppointmentSchema), controller.create);
appointmentsRouter.get("/:id", requireRole(...READERS), controller.getOne);
appointmentsRouter.patch("/:id/status", requireRole(...SCHEDULERS), validate(updateStatusSchema), controller.updateStatus);
appointmentsRouter.patch("/:id/reschedule", requireRole(...SCHEDULERS), validate(rescheduleSchema), controller.reschedule);
