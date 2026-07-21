import { defineConfig } from "vitest/config";
import path from "path";

// Tests de integración con base de datos real (scoping por rol/organigrama).
// Corren contra una base dedicada `flotas_test`; ver tests/integration/README.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://flotas:flotas@localhost:5432/flotas_test";

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    environment: "node",
    // Prisma lee DATABASE_URL al construir el cliente: se inyecta la base de test.
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // Los fixtures comparten la misma base: sin paralelismo entre archivos.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
