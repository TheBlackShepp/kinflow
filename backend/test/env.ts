import path from "path";

// Must run before any module that imports prisma so that DATABASE_URL points at
// the isolated test database (dotenv in src/app.ts only fills missing vars,
// so an already-set DATABASE_URL is preserved).
process.env.DATABASE_URL = `file:${path.resolve(__dirname, "..", ".test.db")}`;
process.env.JWT_SECRET = "test_secret_key";
