import { Prisma, Role } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { assertOrgUnitInScope } from "./org-units";

// Las geocercas sin orgUnit son institucionales (visibles a todo supervisor);
// las asociadas a una unidad se scopean por su subárbol, igual que vehículos.
function geofenceScopeWhere(session: SessionUser): Prisma.GeofenceWhereInput {
  if (session.role === Role.ADMIN) return {};
  if (session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT) {
    return {
      OR: [{ orgUnitId: null }, buildOrgScopeWhere(session) as Prisma.GeofenceWhereInput],
    };
  }
  throw new ForbiddenError();
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type GeofenceInput = {
  name: string;
  description: string | null;
  polygon: Array<[number, number]>;
  orgUnitId: string | null;
  active: boolean;
};

export async function listGeofences(session: SessionUser, filters?: { active?: boolean }) {
  const where: Prisma.GeofenceWhereInput = { AND: [geofenceScopeWhere(session)] };
  if (filters?.active !== undefined) where.active = filters.active;
  return prisma.geofence.findMany({
    where,
    orderBy: { name: "asc" },
    include: { orgUnit: { select: { id: true, name: true } } },
  });
}

export async function getGeofence(session: SessionUser, id: string) {
  const geofence = await prisma.geofence.findFirst({
    where: { id, AND: [geofenceScopeWhere(session)] },
    include: { orgUnit: { select: { id: true, name: true } }, createdBy: { select: { name: true } } },
  });
  if (!geofence) throw new NotFoundError("Geocerca no encontrada");
  return geofence;
}

export async function createGeofence(session: SessionUser, input: GeofenceInput) {
  requireManager(session);
  if (input.orgUnitId) await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.geofence.create({
    data: {
      name: input.name,
      description: input.description,
      polygon: input.polygon,
      orgUnitId: input.orgUnitId,
      active: input.active,
      createdById: session.userId,
    },
  });
}

export async function updateGeofence(session: SessionUser, id: string, input: GeofenceInput) {
  requireManager(session);
  await getGeofence(session, id);
  if (input.orgUnitId) await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.geofence.update({
    where: { id },
    data: {
      name: input.name,
      description: input.description,
      polygon: input.polygon,
      orgUnitId: input.orgUnitId,
      active: input.active,
    },
  });
}

// Consumido por el motor de reglas (lib/jobs/evaluate-alert-rules): geocercas
// activas institucionales + las de cualquier unidad ancestro del vehículo.
export async function systemActiveGeofencesForVehicle(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { orgUnit: { select: { path: true } } },
  });
  if (!vehicle) return [];
  const geofences = await prisma.geofence.findMany({
    where: { active: true },
    include: { orgUnit: { select: { path: true } } },
  });
  return geofences.filter((g) => !g.orgUnit || vehicle.orgUnit.path.startsWith(g.orgUnit.path));
}
