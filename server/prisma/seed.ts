import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD, seedDemo } from "../src/lib/demo-seed.js";

const prisma = new PrismaClient();

seedDemo(prisma)
  .then(async () => {
    const counts = {
      clinics: await prisma.clinic.count(),
      users: await prisma.user.count(),
      patients: await prisma.patient.count(),
      appointments: await prisma.appointment.count(),
    };
    // eslint-disable-next-line no-console
    console.log("Seed complete:", counts);
    // eslint-disable-next-line no-console
    console.log(`All demo accounts use the password: ${DEMO_PASSWORD}`);
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
