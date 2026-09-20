import { Router } from "express";
import type { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createPrescriptionSchema, listPrescriptionsQuerySchema } from "./prescriptions.schemas.js";
import * as controller from "./prescriptions.controller.js";

export const prescriptionsRouter = Router();
prescriptionsRouter.use(authenticate);

const READERS: Role[] = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "STAFF", "PATIENT"];

prescriptionsRouter.get("/", requireRole(...READERS), validate(listPrescriptionsQuerySchema, "query"), controller.list);
prescriptionsRouter.post("/", requireRole("DOCTOR"), validate(createPrescriptionSchema), controller.create);
prescriptionsRouter.get("/:id", requireRole(...READERS), controller.getOne);
prescriptionsRouter.get("/:id/pdf", requireRole(...READERS), controller.pdf);
