import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { audit } from "../../lib/audit.js";
import * as service from "./patients.service.js";
import type { ListPatientsQuery } from "./patients.schemas.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const patient = await service.createPatient(req.user!, req.body);
  await audit({
    clinicId: patient.clinicId,
    userId: req.user!.id,
    action: "patient.create",
    entity: "Patient",
    entityId: patient.id,
    ip: req.ip,
  });
  res.status(201).json({ patient });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listPatients(req.user!, req.query as unknown as ListPatientsQuery);
  res.json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const patient = await service.getPatient(req.user!, req.params.id!);
  res.json({ patient });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const patient = await service.updatePatient(req.user!, req.params.id!, req.body);
  await audit({
    clinicId: patient.clinicId,
    userId: req.user!.id,
    action: "patient.update",
    entity: "Patient",
    entityId: patient.id,
    ip: req.ip,
  });
  res.json({ patient });
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  const patient = await service.deactivatePatient(req.user!, req.params.id!);
  await audit({
    clinicId: patient.clinicId,
    userId: req.user!.id,
    action: "patient.deactivate",
    entity: "Patient",
    entityId: patient.id,
    ip: req.ip,
  });
  res.json({ patient });
});
