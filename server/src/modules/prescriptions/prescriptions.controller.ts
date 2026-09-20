import type { Request, Response } from "express";
import { asyncHandler } from "../../lib/errors.js";
import { audit } from "../../lib/audit.js";
import { prisma } from "../../lib/prisma.js";
import { renderPrescriptionPdf, renderPrescriptionPng, type PrescriptionPdfData } from "../../lib/pdf.js";
import * as service from "./prescriptions.service.js";
import type { ListPrescriptionsQuery } from "./prescriptions.schemas.js";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await service.createPrescription(req.user!, req.body);
  await audit({
    clinicId: prescription.clinicId,
    userId: req.user!.id,
    action: "prescription.create",
    entity: "Prescription",
    entityId: prescription.id,
    ip: req.ip,
  });
  res.status(201).json({ prescription });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await service.listPrescriptions(
    req.user!,
    req.query as unknown as ListPrescriptionsQuery,
  );
  res.json(result);
});

export const getOne = asyncHandler(async (req: Request, res: Response) => {
  const prescription = await service.getPrescription(req.user!, req.params.id!);
  res.json({ prescription });
});

export const pdf = asyncHandler(async (req: Request, res: Response) => {
  const p = await service.getPrescriptionForPdf(req.user!, req.params.id!);

  const data: PrescriptionPdfData = {
    clinic: { name: p.clinic.name, brandColor: p.clinic.brandColor, address: p.clinic.address, phone: p.clinic.phone },
    doctor: { name: p.doctor.name, specialty: p.doctor.specialty, licenseNo: p.doctor.licenseNo },
    patient: { firstName: p.patient.firstName, lastName: p.patient.lastName, mrn: p.patient.mrn, gender: p.patient.gender, dob: p.patient.dob },
    prescription: { id: p.id, issuedAt: p.issuedAt, notes: p.notes },
    items: p.items.map((it) => ({
      drugName: it.drugName,
      dosage: it.dosage,
      frequency: it.frequency,
      durationDays: it.durationDays,
      instructions: it.instructions,
    })),
  };

  // A PNG preview (used by the UI thumbnail) skips persistence.
  if (req.query.format === "png") {
    const png = await renderPrescriptionPng(data);
    res.setHeader("Content-Type", "image/png");
    res.send(png);
    return;
  }

  const { bytes, filePath } = await renderPrescriptionPdf(data);

  // Record the generated document (best-effort) + audit.
  await prisma.document
    .create({
      data: {
        clinicId: p.clinicId,
        patientId: p.patientId,
        type: "PRESCRIPTION",
        title: `Prescription for ${p.patient.firstName} ${p.patient.lastName}`,
        filePath,
        generatedById: req.user!.id,
      },
    })
    .catch(() => undefined);
  await audit({
    clinicId: p.clinicId,
    userId: req.user!.id,
    action: "document.generate",
    entity: "Prescription",
    entityId: p.id,
    metadata: { type: "PRESCRIPTION" },
    ip: req.ip,
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="prescription-${p.id}.pdf"`);
  res.send(bytes);
});
