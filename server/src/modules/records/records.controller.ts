import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { audit } from "../../lib/audit.js";
import * as service from "./records.service.js";
import type { ListRecordsQuery } from "./records.schemas.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const record = await service.createRecord(req.user!, req.body);
  await audit({
    clinicId: record.clinicId,
    userId: req.user!.id,
    action: "record.create",
    entity: "MedicalRecord",
    entityId: record.id,
    ip: req.ip,
  });
  res.status(201).json({ record });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listRecords(req.user!, req.query as unknown as ListRecordsQuery);
  res.json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const record = await service.getRecord(req.user!, req.params.id!);
  res.json({ record });
});
