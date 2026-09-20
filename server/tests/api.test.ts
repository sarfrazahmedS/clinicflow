import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { resetDb, seedTestData } from "./helpers.js";

const app = createApp();
let data: Awaited<ReturnType<typeof seedTestData>>;

const login = async (email: string, password = "Passw0rd!"): Promise<string> => {
  const res = await request(app).post("/api/auth/login").send({ email, password });
  return res.body.accessToken as string;
};
const auth = (token: string) => ["Authorization", `Bearer ${token}`] as [string, string];

beforeAll(async () => {
  await resetDb(prisma);
  data = await seedTestData(prisma);
});
afterAll(async () => {
  await prisma.$disconnect();
});

describe("auth", () => {
  it("logs in with valid credentials", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "doctor@sunrisetest.test", password: "Passw0rd!" });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user.role).toBe("DOCTOR");
  });

  it("rejects a wrong password", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "doctor@sunrisetest.test", password: "nope" });
    expect(res.status).toBe(401);
  });

  it("register creates a new clinic + CLINIC_ADMIN", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ clinicName: "Brand New Clinic", name: "Owner", email: "owner@brandnew.test", password: "Passw0rd!" });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe("CLINIC_ADMIN");
    expect(res.body.user.clinicId).toBeTruthy();
  });
});

describe("tenant isolation", () => {
  it("a clinic only lists its own patients", async () => {
    const token = await login("doctor@sunrisetest.test");
    const res = await request(app).get("/api/patients").set(...auth(token));
    expect(res.status).toBe(200);
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(data.a.patient.id);
    expect(ids).not.toContain(data.b.patient.id);
  });

  it("cross-tenant patient fetch returns 404", async () => {
    const token = await login("doctor@downtowntest.test");
    const res = await request(app).get(`/api/patients/${data.a.patient.id}`).set(...auth(token));
    expect(res.status).toBe(404);
  });
});

describe("authorization / RBAC", () => {
  it("requires a token", async () => {
    const res = await request(app).get("/api/patients");
    expect(res.status).toBe(401);
  });

  it("a PATIENT cannot register patients", async () => {
    const token = await login("patient@sunrisetest.test");
    const res = await request(app).post("/api/patients").set(...auth(token)).send({ firstName: "X", lastName: "Y" });
    expect(res.status).toBe(403);
  });

  it("STAFF can register a patient", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app).post("/api/patients").set(...auth(token)).send({ firstName: "New", lastName: "Person", gender: "MALE" });
    expect(res.status).toBe(201);
  });

  it("rejects invalid input", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app).post("/api/patients").set(...auth(token)).send({ firstName: "" });
    expect(res.status).toBe(400);
  });
});

describe("appointments — business rules", () => {
  const when = new Date(Date.now() + 7 * 864e5).toISOString();
  let apptId = "";

  it("creates an appointment", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app)
      .post("/api/appointments")
      .set(...auth(token))
      .send({ patientId: data.a.patient.id, doctorId: data.a.doctor.id, scheduledAt: when, durationMin: 30 });
    expect(res.status).toBe(201);
    apptId = res.body.appointment.id;
  });

  it("blocks double-booking the same slot", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app)
      .post("/api/appointments")
      .set(...auth(token))
      .send({ patientId: data.a.patient.id, doctorId: data.a.doctor.id, scheduledAt: when, durationMin: 30 });
    expect(res.status).toBe(409);
  });

  it("rejects an invalid status transition (SCHEDULED → COMPLETED)", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app).patch(`/api/appointments/${apptId}/status`).set(...auth(token)).send({ status: "COMPLETED" });
    expect(res.status).toBe(400);
  });

  it("allows a valid status transition (SCHEDULED → CHECKED_IN)", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app).patch(`/api/appointments/${apptId}/status`).set(...auth(token)).send({ status: "CHECKED_IN" });
    expect(res.status).toBe(200);
    expect(res.body.appointment.status).toBe("CHECKED_IN");
  });

  it("cannot book using another clinic's patient", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app)
      .post("/api/appointments")
      .set(...auth(token))
      .send({ patientId: data.b.patient.id, doctorId: data.a.doctor.id, scheduledAt: new Date(Date.now() + 8 * 864e5).toISOString() });
    expect(res.status).toBe(404);
  });
});

describe("prescriptions — RBAC + patient scoping", () => {
  it("a doctor can issue a prescription", async () => {
    const token = await login("doctor@sunrisetest.test");
    const res = await request(app)
      .post("/api/prescriptions")
      .set(...auth(token))
      .send({ patientId: data.a.patient.id, items: [{ drugName: "Amoxicillin 500mg", frequency: "3x/day", durationDays: 5 }] });
    expect(res.status).toBe(201);
    expect(res.body.prescription.items).toHaveLength(1);
  });

  it("STAFF cannot issue a prescription", async () => {
    const token = await login("staff@sunrisetest.test");
    const res = await request(app).post("/api/prescriptions").set(...auth(token)).send({ patientId: data.a.patient.id, items: [{ drugName: "X" }] });
    expect(res.status).toBe(403);
  });

  it("a PATIENT sees only their own prescriptions", async () => {
    const token = await login("patient@sunrisetest.test");
    const res = await request(app).get("/api/prescriptions").set(...auth(token));
    expect(res.status).toBe(200);
    for (const p of res.body.items) {
      expect(p.patient.id).toBe(data.a.patient.id);
    }
  });
});
