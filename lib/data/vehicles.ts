import { Prisma, Role, VehicleStatus, FuelType } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertOrgUnitInScope } from "./org-units";

export function vehicleScopeWhere(session: SessionUser): Prisma.VehicleWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { currentDriverId: session.driverId };
  }
  if (session.role === Role.SUPPLIER) {
    // Los proveedores solo ven vehículos a través de sus propias órdenes (lib/data/supplier-orders).
    throw new ForbiddenError();
  }
  return buildOrgScopeWhere(session) as Prisma.VehicleWhereInput;
}

export type VehicleInput = {
  plate: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  fuelType: FuelType;
  tankCapacityLiters: number | null;
  odometerKm: number;
  orgUnitId: string;
};

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export async function listVehicles(
  session: SessionUser,
  filters?: { status?: VehicleStatus; q?: string; orgUnitId?: string },
) {
  const where: Prisma.VehicleWhereInput = { AND: [vehicleScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.orgUnitId) where.orgUnitId = filters.orgUnitId;
  if (filters?.q) {
    where.OR = [
      { plate: { contains: filters.q, mode: "insensitive" } },
      { brand: { contains: filters.q, mode: "insensitive" } },
      { model: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return prisma.vehicle.findMany({
    where,
    orderBy: { plate: "asc" },
    include: {
      orgUnit: { select: { id: true, name: true } },
      currentDriver: { select: { id: true, firstName: true, lastName: true } },
      traccarDevice: { select: { id: true, uniqueId: true, connectionStatus: true, traccarId: true } },
    },
  });
}

export async function getVehicle(session: SessionUser, id: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id, AND: [vehicleScopeWhere(session)] },
    include: {
      orgUnit: true,
      currentDriver: true,
      traccarDevice: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!vehicle) throw new NotFoundError("Vehículo no encontrado");
  return vehicle;
}

export async function createVehicle(session: SessionUser, input: VehicleInput) {
  requireManager(session);
  await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.vehicle.create({ data: input });
}

export async function updateVehicle(session: SessionUser, id: string, input: VehicleInput) {
  requireManager(session);
  await getVehicle(session, id);
  await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.vehicle.update({ where: { id }, data: input });
}

export async function changeVehicleStatus(
  session: SessionUser,
  id: string,
  toStatus: VehicleStatus,
  reason: string | null,
) {
  requireManager(session);
  const vehicle = await getVehicle(session, id);
  if (vehicle.status === toStatus) {
    throw new ValidationError("El vehículo ya está en ese estado");
  }
  return prisma.$transaction([
    prisma.vehicle.update({ where: { id }, data: { status: toStatus } }),
    prisma.vehicleStatusHistory.create({
      data: { vehicleId: id, fromStatus: vehicle.status, toStatus, reason, changedById: session.userId },
    }),
  ]);
}

export async function assignDriver(session: SessionUser, id: string, driverId: string | null) {
  requireManager(session);
  await getVehicle(session, id);
  if (driverId) {
    const driver = await prisma.driver.findFirst({
      where: { id: driverId, AND: [buildOrgScopeWhere(session) as Prisma.DriverWhereInput] },
    });
    if (!driver) throw new NotFoundError("Conductor no encontrado en su alcance");
  }
  return prisma.vehicle.update({ where: { id }, data: { currentDriverId: driverId } });
}
