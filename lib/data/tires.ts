import { Prisma, Role, TireStatus, TireMovementType } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";

// Los neumáticos en depósito (sin vehículo) son visibles para cualquier
// supervisor; los montados se scopean por la unidad del vehículo.
function tireScopeWhere(session: SessionUser): Prisma.TireWhereInput {
  if (session.role === Role.ADMIN) return {};
  if (session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT) {
    return {
      OR: [
        { currentVehicleId: null },
        { currentVehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput },
      ],
    };
  }
  throw new ForbiddenError();
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type TireInput = {
  serialNumber: string;
  brand: string;
  model: string;
  size: string;
  treadDepthMm: number | null;
};

export async function listTires(session: SessionUser, filters?: { status?: TireStatus; q?: string }) {
  const where: Prisma.TireWhereInput = { AND: [tireScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.q) {
    where.OR = [
      { serialNumber: { contains: filters.q, mode: "insensitive" } },
      { brand: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return prisma.tire.findMany({
    where,
    orderBy: { serialNumber: "asc" },
    include: { currentVehicle: { select: { id: true, plate: true } } },
  });
}

export async function getTire(session: SessionUser, id: string) {
  const tire = await prisma.tire.findFirst({
    where: { id, AND: [tireScopeWhere(session)] },
    include: {
      currentVehicle: { select: { id: true, plate: true } },
      movements: {
        orderBy: { createdAt: "desc" },
        include: {
          vehicle: { select: { plate: true } },
          performedBy: { select: { name: true } },
        },
      },
    },
  });
  if (!tire) throw new NotFoundError("Neumático no encontrado");
  return tire;
}

export async function createTire(session: SessionUser, input: TireInput) {
  requireManager(session);
  return prisma.tire.create({ data: input });
}

export type TireMovementInput = {
  type: TireMovementType;
  vehicleId: string | null;
  toPosition: string | null;
  odometerKm: number | null;
  treadDepthMm: number | null;
  notes: string | null;
};

const RESULT_STATUS: Record<TireMovementType, TireStatus> = {
  MOUNT: TireStatus.MOUNTED,
  ROTATE: TireStatus.MOUNTED,
  DISMOUNT: TireStatus.IN_STOCK,
  REPAIR: TireStatus.IN_REPAIR,
  DISCARD: TireStatus.DISCARDED,
};

export async function registerTireMovement(session: SessionUser, tireId: string, input: TireMovementInput) {
  requireManager(session);
  const tire = await getTire(session, tireId);

  if (tire.status === TireStatus.DISCARDED) {
    throw new ValidationError("El neumático está dado de baja");
  }

  let vehicleId: string | null = null;
  if (input.type === TireMovementType.MOUNT || input.type === TireMovementType.ROTATE) {
    vehicleId = input.vehicleId ?? tire.currentVehicleId;
    if (!vehicleId) throw new ValidationError("Debe indicar el vehículo");
    if (!input.toPosition) throw new ValidationError("Debe indicar la posición de montaje");
    await getVehicle(session, vehicleId);
    if (input.type === TireMovementType.MOUNT && tire.status === TireStatus.MOUNTED) {
      throw new ValidationError("El neumático ya está montado; use rotación o desmontaje");
    }
    if (input.type === TireMovementType.ROTATE && tire.status !== TireStatus.MOUNTED) {
      throw new ValidationError("Solo se puede rotar un neumático montado");
    }
  } else if (tire.currentVehicleId) {
    await getVehicle(session, tire.currentVehicleId);
  }

  const newStatus = RESULT_STATUS[input.type];
  const keepsVehicle = newStatus === TireStatus.MOUNTED;

  const [, movement] = await prisma.$transaction([
    prisma.tire.update({
      where: { id: tireId },
      data: {
        status: newStatus,
        currentVehicleId: keepsVehicle ? vehicleId : null,
        currentPosition: keepsVehicle ? input.toPosition : null,
        ...(input.treadDepthMm !== null ? { treadDepthMm: input.treadDepthMm } : {}),
      },
    }),
    prisma.tireMovement.create({
      data: {
        tireId,
        type: input.type,
        vehicleId: keepsVehicle ? vehicleId : tire.currentVehicleId,
        fromPosition: tire.currentPosition,
        toPosition: keepsVehicle ? input.toPosition : null,
        odometerKm: input.odometerKm,
        notes: input.notes,
        performedById: session.userId,
      },
    }),
  ]);
  return movement;
}
