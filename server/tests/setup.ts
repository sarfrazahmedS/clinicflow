// Runs in each test worker BEFORE the app/prisma modules are imported, so the
// server connects to the TEST database (never the dev one). dotenv won't
// override values that are already set here.
const TEST_DB =
  process.env.DATABASE_URL && /test/i.test(process.env.DATABASE_URL)
    ? process.env.DATABASE_URL
    : "postgresql://postgres:12345@localhost:5432/clinicflow_test?schema=public";

process.env.DATABASE_URL = TEST_DB;
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "test-access-secret-0123456789abcdef";
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "test-refresh-secret-0123456789abcdef";
process.env.NODE_ENV = "test";
