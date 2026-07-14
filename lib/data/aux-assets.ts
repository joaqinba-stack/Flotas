import { Prisma, Role, AuxAssetStatus, AuxAssetMovementType } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";

function assetScopeWhere(session: SessionUser): Prisma.AuxiliaryAssetWhereInput {
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

export type AuxAssetInput = {
  code: string;
  name: string;
  category: string;
};

export async function listAuxAssets(
  session: SessionUser,
  filters?: { status?: AuxAssetStatus; q?: string },
) {
  const where: Prisma.AuxiliaryAssetWhereInput = { AND: [assetScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.q) {
    where.OR = [
      { code: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } },
      { category: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return prisma.auxiliaryAsset.findMany({
    where,
    orderBy: { code: "asc" },
    include: { currentVehicle: { select: { id: true, plate: true } } },
  });
}

export async function getAuxAsset(session: SessionUser, id: string) {
  const asset = await prisma.auxiliaryAsset.findFirst({
    where: { id, AND: [assetScopeWhere(session)] },
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
  if (!asset) throw new NotFoundError("Activo auxiliar no encontrado");
  return asset;
}

export async function createAuxAsset(session: SessionUser, input: AuxAssetInput) {
  requireManager(session);
  return prisma.auxiliaryAsset.create({ data: input });
}

const RESULT_STATUS: Record<AuxAssetMovementType, AuxAssetStatus> = {
  ASSIGN: AuxAssetStatus.ASSIGNED,
  RETURN: AuxAssetStatus.IN_STOCK,
  REPAIR: AuxAssetStatus.IN_REPAIR,
  RETIRE: AuxAssetStatus.RETIRED,
};

export async function registerAuxAssetMovement(
  session: SessionUser,
  assetId: string,
  input: { type: AuxAssetMovementType; vehicleId: string | null; notes: string | null },
) {
  requireManager(session);
  const asset = await getAuxAsset(session, assetId);
  if (asset.status === AuxAssetStatus.RETIRED) {
    throw new ValidationError("El activo está dado de baja");
  }

  let vehicleId: string | null = null;
  if (input.type === AuxAssetMovementType.ASSIGN) {
    if (!input.vehicleId) throw new ValidationError("Debe indicar el vehículo");
    vehicleId = input.vehicleId;
    await getVehicle(session, vehicleId);
  } else if (asset.currentVehicleId) {
    await getVehicle(session, asset.currentVehicleId);
  }

  const newStatus = RESULT_STATUS[input.type];
  const [, movement] = await prisma.$transaction([
    prisma.auxiliaryAsset.update({
      where: { id: assetId },
      data: {
        status: newStatus,
        currentVehicleId: newStatus === AuxAssetStatus.ASSIGNED ? vehicleId : null,
      },
    }),
    prisma.auxiliaryAssetMovement.create({
      data: {
        assetId,
        type: input.type,
        vehicleId: newStatus === AuxAssetStatus.ASSIGNED ? vehicleId : asset.currentVehicleId,
        notes: input.notes,
        performedById: session.userId,
      },
    }),
  ]);
  return movement;
}
