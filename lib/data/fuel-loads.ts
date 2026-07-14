import { Prisma, Role, FuelType, FuelValidationStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";
import { validateFuelLoad } from "@/lib/validation/fuel-load-rules";

function fuelScopeWhere(session: SessionUser): Prisma.FuelLoadWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { driverId: session.driverId };
  }
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  return { vehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput };
}

export type FuelLoadInput = {
  vehicleId: string;
  jornadaId: string | null;
  loadedAt: Date;
  liters: number;
  pricePerLiter: number | null;
  odometerKm: number;
  station: string | null;
  fuelType: FuelType;
};

export async function listFuelLoads(
  session: SessionUser,
  filters?: { vehicleId?: string; validationStatus?: FuelValidationStatus; from?: Date; to?: Date },
) {
  const where: Prisma.FuelLoadWhereInput = { AND: [fuelScopeWhere(session)] };
  if (filters?.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters?.validationStatus) where.validationStatus = filters.validationStatus;
  if (filters?.from || filters?.to) {
    where.loadedAt = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  return prisma.fuelLoad.findMany({
    where,
    orderBy: { loadedAt: "desc" },
    take: 300,
    include: {
      vehicle: { select: { id: true, plate: true } },
      driver: { select: { firstName: true, lastName: true } },
      jornada: { select: { id: true, purpose: true } },
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });
}

export async function getFuelLoad(session: SessionUser, id: string) {
  const load = await prisma.fuelLoad.findFirst({
    where: { id, AND: [fuelScopeWhere(session)] },
    include: {
      vehicle: { select: { id: true, plate: true, tankCapacityLiters: true } },
      driver: { select: { firstName: true, lastName: true } },
      jornada: { select: { id: true, purpose: true } },
      createdBy: { select: { name: true } },
      reviewedBy: { select: { name: true } },
    },
  });
  if (!load) throw new NotFoundError("Carga de combustible no encontrada");
  return load;
}

export async function createFuelLoad(session: SessionUser, input: FuelLoadInput) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR && session.role !== Role.DRIVER) {
    throw new ForbiddenError();
  }
  // getVehicle ya limita: DRIVER solo su vehículo asignado, SUPERVISOR su subárbol.
  const vehicle = await getVehicle(session, input.vehicleId);

  const driverId = session.role === Role.DRIVER ? session.driverId : (vehicle.currentDriverId ?? null);

  if (input.jornadaId) {
    const jornada = await prisma.jornadaOperativa.findUnique({ where: { id: input.jornadaId } });
    if (!jornada || jornada.vehicleId !== input.vehicleId) {
      throw new ValidationError("La jornada indicada no corresponde al vehículo");
    }
    if (session.role === Role.DRIVER && jornada.driverId !== session.driverId) {
      throw new ForbiddenError("La jornada no pertenece al conductor");
    }
  }

  const previousLoads = await prisma.fuelLoad.findMany({
    where: { vehicleId: input.vehicleId, validationStatus: { not: FuelValidationStatus.REJECTED } },
    orderBy: { loadedAt: "desc" },
    take: 10,
    select: { loadedAt: true, liters: true, odometerKm: true },
  });

  const validation = validateFuelLoad(
    {
      liters: input.liters,
      odometerKm: input.odometerKm,
      loadedAt: input.loadedAt,
      fuelType: input.fuelType,
    },
    {
      tankCapacityLiters: vehicle.tankCapacityLiters ? Number(vehicle.tankCapacityLiters) : null,
      vehicleFuelType: vehicle.fuelType,
      previousLoads: previousLoads.map((p) => ({
        loadedAt: p.loadedAt,
        liters: Number(p.liters),
        odometerKm: p.odometerKm,
      })),
    },
  );

  return prisma.fuelLoad.create({
    data: {
      vehicleId: input.vehicleId,
      driverId,
      jornadaId: input.jornadaId,
      loadedAt: input.loadedAt,
      liters: input.liters,
      pricePerLiter: input.pricePerLiter,
      totalCost: input.pricePerLiter !== null ? Math.round(input.liters * input.pricePerLiter * 100) / 100 : null,
      odometerKm: input.odometerKm,
      station: input.station,
      fuelType: input.fuelType,
      validationStatus: validation.status,
      validationFlags: validation.flags,
      createdById: session.userId,
    },
  });
}

// Auditoría manual de cargas observadas (ADMIN/SUPERVISOR).
export async function reviewFuelLoad(
  session: SessionUser,
  id: string,
  decision: "VALID" | "REJECTED",
  note: string | null,
) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
  await getFuelLoad(session, id);
  return prisma.fuelLoad.update({
    where: { id },
    data: {
      validationStatus: decision === "VALID" ? FuelValidationStatus.VALID : FuelValidationStatus.REJECTED,
      reviewedById: session.userId,
      reviewNote: note,
    },
  });
}
