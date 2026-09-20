import { execSync } from "node:child_process";

// Push the Prisma schema to the TEST database once before the suite runs.
const TEST_DB =
  process.env.DATABASE_URL && /test/i.test(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : "postgresql://postgres:12345@localhost:5432/clinicflow_test?schema=public";

export default function setup(): void {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
}
