import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(__dirname, "..", ".test.db");

// Reset and prepare an isolated test database before the test suite runs.
export default function globalSetup() {
  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath, { force: true });
  }

  const env = {
    ...process.env,
    DATABASE_URL: `file:${dbPath}`,
    JWT_SECRET: "test_secret_key",
  };

  execSync("npx prisma db push", {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: "inherit",
  });
}
