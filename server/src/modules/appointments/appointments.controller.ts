import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { audit } from "../../lib/audit.js";
import * as service from "./appointments.service.js";
import type { ListAppointmentsQuery } from "./appointments.schemas.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await service.createAppointment(req.user!, req.body);
  await audit({
    clinicId: appointment.clinicId,
    userId: req.user!.id,
    action: "appointment.create",
    entity: "Appointment",
    entityId: appointment.id,
    ip: req.ip,
  });
  res.status(201).json({ appointment });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listAppointments(
    req.user!,
    req.query as unknown as ListAppointmentsQuery,
  );
  res.json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await service.getAppointment(req.user!, req.params.id!);
  res.json({ appointment });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await service.updateStatus(req.user!, req.params.id!, req.body.status);
  await audit({
    clinicId: appointment.clinicId,
    userId: req.user!.id,
    action: "appointment.status",
    entity: "Appointment",
    entityId: appointment.id,
    metadata: { status: appointment.status },
    ip: req.ip,
  });
  res.json({ appointment });
});

export const reschedule = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await service.reschedule(req.user!, req.params.id!, req.body);
  await audit({
    clinicId: appointment.clinicId,
    userId: req.user!.id,
    action: "appointment.reschedule",
    entity: "Appointment",
    entityId: appointment.id,
    ip: req.ip,
  });
  res.json({ appointment });
});
