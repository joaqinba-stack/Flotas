import { randomUUID } from "crypto";
import { PrismaClient, Role, OrgUnitKind, FuelType, VehicleStatus, DriverStatus } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";

export const prisma = new PrismaClient();

// Borra todo el contenido de la base de test en orden seguro de FK.
export async function wipe() {
  await prisma.alertNotificationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.reportRun.deleteMany();
  await prisma.reportDefinition.deleteMany();
  await prisma.deskTicketNote.deleteMany();
  await prisma.deskTicket.deleteMany();
  await prisma.supplierServiceOrderNote.deleteMany();
  await prisma.supplierServiceOrder.deleteMany();
  await prisma.incidentAttachment.deleteMany();
  await prisma.incidentNote.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.auxiliaryAssetMovement.deleteMany();
  await prisma.auxiliaryAsset.deleteMany();
  await prisma.tireMovement.deleteMany();
  await prisma.tire.deleteMany();
  await prisma.driverPerformanceRecord.deleteMany();
  await prisma.novedad.deleteMany();
  await prisma.permit.deleteMany();
  await prisma.viatico.deleteMany();
  await prisma.fuelLoad.deleteMany();
  await prisma.positionSnapshot.deleteMany();
  await prisma.jornadaOperativa.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.vehicleStatusHistory.deleteMany();
  await prisma.traccarDevice.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.vehicle.updateMany({ data: { currentDriverId: null } });
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.orgUnit.deleteMany();
  await prisma.catalogItem.deleteMany();
}

function sessionFor(overrides: Partial<SessionUser> & Pick<SessionUser, "role">): SessionUser {
  return {
    userId: overrides.userId ?? randomUUID(),
    email: overrides.email ?? "u@test.local",
    name: overrides.name ?? "Test",
    role: overrides.role,
    orgUnitId: overrides.orgUnitId ?? null,
    orgPath: overrides.orgPath ?? null,
    driverId: overrides.driverId ?? null,
    supplierId: overrides.supplierId ?? null,
  };
}

/**
 * Construye un árbol organizativo con dos bases hermanas (Norte y Sur) bajo un
 * Departamento, y puebla vehículos/conductores/proveedores/órdenes en cada una.
 * Devuelve ids y sesiones listas para probar el scoping.
 */
export async function buildFixture() {
  const password = "x";

  const dirId = randomUUID();
  await prisma.orgUnit.create({ data: { id: dirId, name: "Dir", kind: OrgUnitKind.DIRECCION, path: `/${dirId}/` } });
  const depId = randomUUID();
  await prisma.orgUnit.create({ data: { id: depId, name: "Dep", kind: OrgUnitKind.DEPARTAMENTO, parentId: dirId, path: `/${dirId}/${depId}/` } });
  const norteId = randomUUID();
  const nortePath = `/${dirId}/${depId}/${norteId}/`;
  await prisma.orgUnit.create({ data: { id: norteId, name: "Norte", kind: OrgUnitKind.BASE_LOGISTICA, parentId: depId, path: nortePath } });
  const surId = randomUUID();
  const surPath = `/${dirId}/${depId}/${surId}/`;
  await prisma.orgUnit.create({ data: { id: surId, name: "Sur", kind: OrgUnitKind.BASE_LOGISTICA, parentId: depId, path: surPath } });

  const driverNorte = await prisma.driver.create({
    data: { firstName: "N", lastName: "Orte", documentId: "D-" + randomUUID().slice(0, 8), licenseNumber: "L1", licenseCategory: "D2", licenseExpiry: new Date(Date.now() + 1e10), status: DriverStatus.ACTIVE, orgUnitId: norteId },
  });
  const driverSur = await prisma.driver.create({
    data: { firstName: "S", lastName: "Ur", documentId: "D-" + randomUUID().slice(0, 8), licenseNumber: "L2", licenseCategory: "D2", licenseExpiry: new Date(Date.now() + 1e10), status: DriverStatus.ACTIVE, orgUnitId: surId },
  });

  const vehNorte = await prisma.vehicle.create({
    data: { plate: "N-" + randomUUID().slice(0, 6), brand: "B", model: "M", year: 2022, type: "T", fuelType: FuelType.DIESEL, odometerKm: 1000, status: VehicleStatus.ACTIVE, orgUnitId: norteId, currentDriverId: driverNorte.id },
  });
  const vehSur = await prisma.vehicle.create({
    data: { plate: "S-" + randomUUID().slice(0, 6), brand: "B", model: "M", year: 2022, type: "T", fuelType: FuelType.DIESEL, odometerKm: 1000, status: VehicleStatus.ACTIVE, orgUnitId: surId, currentDriverId: driverSur.id },
  });

  const supplierA = await prisma.supplier.create({ data: { name: "Prov A", taxId: "T-" + randomUUID().slice(0, 8), serviceTypes: "S" } });
  const supplierB = await prisma.supplier.create({ data: { name: "Prov B", taxId: "T-" + randomUUID().slice(0, 8), serviceTypes: "S" } });

  const admin = await prisma.user.create({ data: { email: `admin-${randomUUID().slice(0, 6)}@t.local`, name: "Admin", role: Role.ADMIN, passwordHash: password } });
  const driverUser = await prisma.user.create({ data: { email: `drv-${randomUUID().slice(0, 6)}@t.local`, name: "Drv", role: Role.DRIVER, passwordHash: password, orgUnitId: norteId, driverId: driverNorte.id } });
  const supplierUserA = await prisma.user.create({ data: { email: `sup-${randomUUID().slice(0, 6)}@t.local`, name: "SupA", role: Role.SUPPLIER, passwordHash: password, supplierId: supplierA.id } });

  const orderA = await prisma.supplierServiceOrder.create({
    data: { supplierId: supplierA.id, vehicleId: vehNorte.id, title: "OA", description: "d", createdById: admin.id },
  });
  const orderB = await prisma.supplierServiceOrder.create({
    data: { supplierId: supplierB.id, vehicleId: vehSur.id, title: "OB", description: "d", createdById: admin.id },
  });

  return {
    ids: { dirId, depId, norteId, surId, nortePath, surPath, vehNorte, vehSur, driverNorte, driverSur, supplierA, supplierB, orderA, orderB },
    sessions: {
      admin: sessionFor({ role: Role.ADMIN, userId: admin.id }),
      // Supervisor del Departamento: ve ambas bases
      supervisorDep: sessionFor({ role: Role.SUPERVISOR, orgUnitId: depId, orgPath: `/${dirId}/${depId}/` }),
      // Supervisor solo de la Base Norte: NO debe ver la Sur
      supervisorNorte: sessionFor({ role: Role.SUPERVISOR, orgUnitId: norteId, orgPath: nortePath }),
      // Desk agent con alcance de toda la Dirección
      deskDir: sessionFor({ role: Role.DESK_AGENT, orgUnitId: dirId, orgPath: `/${dirId}/` }),
      driver: sessionFor({ role: Role.DRIVER, userId: driverUser.id, driverId: driverNorte.id, orgUnitId: norteId }),
      supplierA: sessionFor({ role: Role.SUPPLIER, userId: supplierUserA.id, supplierId: supplierA.id }),
      // Supervisor sin unidad asignada: el scoping debe fallar, no abrir todo
      supervisorSinOrg: sessionFor({ role: Role.SUPERVISOR, orgUnitId: null, orgPath: null }),
    },
  };
}
