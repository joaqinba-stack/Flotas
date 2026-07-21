import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const restrictedPrismaImport = {
  paths: [
    {
      name: "@prisma/client",
      message:
        "Prohibido importar @prisma/client fuera de lib/data/** y lib/jobs/**. Usar los repositorios con scope de lib/data (o re-exports de lib/data/types).",
    },
  ],
  patterns: [
    {
      group: ["@prisma/client/*", ".prisma/client*"],
      message:
        "Prohibido importar el cliente Prisma fuera de lib/data/** y lib/jobs/**.",
    },
  ],
};

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "var/**", "prisma/migrations/**", "next-env.d.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.mts"],
    rules: {
      "no-restricted-imports": ["error", restrictedPrismaImport],
    },
  },
  {
    // lib/data y lib/jobs son la capa autorizada a usar Prisma directamente;
    // prisma/** son seeds/migraciones; tests/integration necesita un cliente
    // crudo para montar y limpiar fixtures contra la base de test.
    files: ["lib/data/**", "lib/jobs/**", "prisma/**", "tests/integration/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
