import { Router } from "express";
import type { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import {
  createPatientSchema,
  listPatientsQuerySchema,
  updatePatientSchema,
} from "./patients.schemas.js";
import * as controller from "./patients.controller.js";

export const patientsRouter = Router();
patientsRouter.use(authenticate);

const READERS: Role[] = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "STAFF"];
const WRITERS: Role[] = ["CLINIC_ADMIN", "DOCTOR", "STAFF"];

patientsRouter.get("/", requireRole(...READERS), validate(listPatientsQuerySchema, "query"), controller.list);
patientsRouter.post("/", requireRole(...WRITERS), validate(createPatientSchema), controller.create);
patientsRouter.get("/:id", requireRole(...READERS), controller.getOne);
patientsRouter.patch("/:id", requireRole(...WRITERS), validate(updatePatientSchema), controller.update);
patientsRouter.delete("/:id", requireRole("CLINIC_ADMIN", "SUPER_ADMIN"), controller.remove);
