import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Los tests de integración necesitan una base de datos dedicada y corren
    // con su propia config (vitest.integration.config.ts / npm run test:integration).
    // Se excluyen del runner unitario para que `npm test` sea puro y sin DB.
    exclude: ["node_modules/**", "tests/integration/**"],
    environment: "node",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
});
