// Production-safe seed: only populates the database when it is empty, so a
// redeploy never wipes real activity. Compiled to dist/scripts/seed.js and run
// on container start (see package.json `start:prod`).
import { prisma } from "../lib/prisma.js";
import { seedDemo } from "../lib/demo-seed.js";

const clinics = await prisma.clinic.count();
if (clinics === 0) {
  await seedDemo(prisma);
  // eslint-disable-next-line no-console
  console.log("Demo data seeded.");
} else {
  // eslint-disable-next-line no-console
  console.log(`Skipping seed — ${clinics} clinic(s) already present.`);
}
await prisma.$disconnect();
