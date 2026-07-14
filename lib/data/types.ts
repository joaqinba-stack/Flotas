// Único punto de re-export de enums/tipos generados por Prisma para el resto
// de la app: la regla ESLint prohíbe importar @prisma/client fuera de lib/data.
export {
  Role,
  OrgUnitKind,
  DriverStatus,
  VehicleStatus,
  FuelType,
  DeviceConnectionStatus,
} from "@prisma/client";
export type {
  OrgUnit,
  User,
  Driver,
  Supplier,
  Vehicle,
  VehicleStatusHistory,
  TraccarDevice,
  PositionSnapshot,
} from "@prisma/client";
