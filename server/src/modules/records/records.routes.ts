import { Router } from "express";
import type { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/authorize.js";
import { validate } from "../../middleware/validate.js";
import { createRecordSchema, listRecordsQuerySchema } from "./records.schemas.js";
import * as controller from "./records.controller.js";

export const recordsRouter = Router();
recordsRouter.use(authenticate);

const READERS: Role[] = ["SUPER_ADMIN", "CLINIC_ADMIN", "DOCTOR", "STAFF", "PATIENT"];

recordsRouter.get("/", requireRole(...READERS), validate(listRecordsQuerySchema, "query"), controller.list);
recordsRouter.post("/", requireRole("DOCTOR"), validate(createRecordSchema), controller.create);
recordsRouter.get("/:id", requireRole(...READERS), controller.getOne);
