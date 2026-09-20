const BASE = "http://localhost:4000/api";
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? "  -> " + extra : "")); }
};
const login = async (email, password = "Passw0rd!") => {
  const r = await fetch(`${BASE}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, token: j.accessToken, user: j.user };
};
const authH = (t) => ({ Authorization: `Bearer ${t}`, "Content-Type": "application/json" });

console.log("\n== AUTH ==");
const h = await fetch(`${BASE}/health`); check("health 200", h.status === 200);
const drS = await login("dr.smith@sunrise.dev");
check("Sunrise doctor login 200", drS.status === 200 && !!drS.token);
check("token carries role DOCTOR", drS.user?.role === "DOCTOR");
const badpw = await login("dr.smith@sunrise.dev", "wrong");
check("wrong password -> 401", badpw.status === 401, `got ${badpw.status}`);

console.log("\n== TENANT ISOLATION ==");
const pS = await fetch(`${BASE}/patients`, { headers: authH(drS.token) });
const pSj = await pS.json();
const sunriseId = pSj.items?.[0]?.id;
check("Sunrise patients list 200", pS.status === 200);
check("Sunrise has patients", (pSj.total || 0) > 0, `total=${pSj.total}`);
const drD = await login("dr.smith@downtown.dev");
const pD = await fetch(`${BASE}/patients`, { headers: authH(drD.token) });
const pDj = await pD.json();
const downtownIds = new Set((pDj.items || []).map((x) => x.id));
check("Downtown sees a different patient set", !downtownIds.has(sunriseId), `sunriseId in downtown? ${downtownIds.has(sunriseId)}`);
const cross = await fetch(`${BASE}/patients/${sunriseId}`, { headers: authH(drD.token) });
check("cross-tenant patient GET -> 404", cross.status === 404, `got ${cross.status}`);

console.log("\n== AUTHZ / RBAC ==");
const noAuth = await fetch(`${BASE}/patients`);
check("no token -> 401", noAuth.status === 401, `got ${noAuth.status}`);
const patient = await login("patient@sunrise.dev");
const patCreate = await fetch(`${BASE}/patients`, { method: "POST", headers: authH(patient.token), body: JSON.stringify({ firstName: "X", lastName: "Y" }) });
check("PATIENT role cannot create patient -> 403", patCreate.status === 403, `got ${patCreate.status}`);
const staff = await login("reception@sunrise.dev");
const created = await fetch(`${BASE}/patients`, { method: "POST", headers: authH(staff.token), body: JSON.stringify({ firstName: "New", lastName: "Walkin", gender: "MALE" }) });
const createdJ = await created.json();
check("STAFF create patient -> 201", created.status === 201, `got ${created.status}`);
const newPatientId = createdJ.patient?.id;
const invalid = await fetch(`${BASE}/patients`, { method: "POST", headers: authH(staff.token), body: JSON.stringify({ firstName: "" }) });
check("invalid body -> 400", invalid.status === 400, `got ${invalid.status}`);

console.log("\n== APPOINTMENTS / BUSINESS RULES ==");
const doctorId = drS.user.id;
const when = new Date(Date.now() + 6 * 864e5); when.setHours(9, 0, 0, 0);
const mk = await fetch(`${BASE}/appointments`, { method: "POST", headers: authH(staff.token), body: JSON.stringify({ patientId: newPatientId, doctorId, scheduledAt: when.toISOString(), durationMin: 30, reason: "Test visit" }) });
const mkJ = await mk.json();
check("create appointment -> 201", mk.status === 201, `got ${mk.status} ${JSON.stringify(mkJ).slice(0,120)}`);
const apptId = mkJ.appointment?.id;
const dbl = await fetch(`${BASE}/appointments`, { method: "POST", headers: authH(staff.token), body: JSON.stringify({ patientId: newPatientId, doctorId, scheduledAt: when.toISOString(), durationMin: 30, reason: "Clash" }) });
check("double-booking same slot -> 409", dbl.status === 409, `got ${dbl.status}`);
const badJump = await fetch(`${BASE}/appointments/${apptId}/status`, { method: "PATCH", headers: authH(staff.token), body: JSON.stringify({ status: "COMPLETED" }) });
check("invalid status SCHEDULED->COMPLETED -> 400", badJump.status === 400, `got ${badJump.status}`);
const okJump = await fetch(`${BASE}/appointments/${apptId}/status`, { method: "PATCH", headers: authH(staff.token), body: JSON.stringify({ status: "CHECKED_IN" }) });
check("valid status SCHEDULED->CHECKED_IN -> 200", okJump.status === 200, `got ${okJump.status}`);

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
