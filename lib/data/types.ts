// Único punto de re-export de enums/tipos generados por Prisma para el resto
// de la app: la regla ESLint prohíbe importar @prisma/client fuera de lib/data.
export { Role, OrgUnitKind, DriverStatus } from "@prisma/client";
export type { OrgUnit, User, Driver, Supplier } from "@prisma/client";
