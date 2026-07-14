import { Prisma, Role, JornadaStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";
import { getDriver } from "./drivers";

export function jornadaScopeWhere(session: SessionUser): Prisma.JornadaOperativaWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { driverId: session.driverId };
  }
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  return buildOrgScopeWhere(session) as Prisma.JornadaOperativaWhereInput;
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type JornadaInput = {
  vehicleId: string;
  driverId: string;
  purpose: string;
  plannedStart: Date;
  plannedEnd: Date;
  notes: string | null;
};

export async function listJornadas(
  session: SessionUser,
  filters?: {
    status?: JornadaStatus;
    vehicleId?: string;
    driverId?: string;
    from?: Date;
    to?: Date;
  },
) {
  const where: Prisma.JornadaOperativaWhereInput = { AND: [jornadaScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.vehicleId) where.vehicleId = filters.vehicleId;
  if (filters?.driverId) where.driverId = filters.driverId;
  if (filters?.from || filters?.to) {
    where.plannedStart = {
      ...(filters.from ? { gte: filters.from } : {}),
      ...(filters.to ? { lte: filters.to } : {}),
    };
  }
  return prisma.jornadaOperativa.findMany({
    where,
    orderBy: { plannedStart: "desc" },
    take: 300,
    include: {
      vehicle: { select: { id: true, plate: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      orgUnit: { select: { id: true, name: true } },
    },
  });
}

export async function getJornada(session: SessionUser, id: string) {
  const jornada = await prisma.jornadaOperativa.findFirst({
    where: { id, AND: [jornadaScopeWhere(session)] },
    include: {
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      orgUnit: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      fuelLoads: { orderBy: { loadedAt: "asc" } },
      viaticos: { orderBy: { createdAt: "asc" }, include: { approvedBy: { select: { name: true } }, createdBy: { select: { name: true } } } },
      permits: { orderBy: { createdAt: "asc" }, include: { approvedBy: { select: { name: true } }, requestedBy: { select: { name: true } } } },
      novedades: { orderBy: { occurredAt: "asc" }, include: { reportedBy: { select: { name: true } } } },
      incidents: {
        orderBy: { occurredAt: "asc" },
        select: { id: true, code: true, title: true, urgency: true, status: true, occurredAt: true },
      },
    },
  });
  if (!jornada) throw new NotFoundError("Jornada operativa no encontrada");
  return jornada;
}

export async function createJornada(session: SessionUser, input: JornadaInput) {
  requireManager(session);
  const vehicle = await getVehicle(session, input.vehicleId);
  await getDriver(session, input.driverId);
  if (input.plannedEnd <= input.plannedStart) {
    throw new ValidationError("El fin planificado debe ser posterior al inicio");
  }
  return prisma.jornadaOperativa.create({
    data: {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      orgUnitId: vehicle.orgUnitId,
      purpose: input.purpose,
      plannedStart: input.plannedStart,
      plannedEnd: input.plannedEnd,
      notes: input.notes,
      createdById: session.userId,
    },
  });
}

const TRANSITIONS: Record<JornadaStatus, JornadaStatus[]> = {
  PLANNED: [JornadaStatus.IN_PROGRESS, JornadaStatus.CANCELLED],
  IN_PROGRESS: [JornadaStatus.COMPLETED, JornadaStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export async function startJornada(session: SessionUser, id: string, startOdometerKm: number | null) {
  const jornada = await getJornada(session, id);
  if (session.role === Role.DESK_AGENT) throw new ForbiddenError();
  if (!TRANSITIONS[jornada.status].includes(JornadaStatus.IN_PROGRESS)) {
    throw new ValidationError(`No se puede iniciar una jornada en estado ${jornada.status}`);
  }
  return prisma.jornadaOperativa.update({
    where: { id },
    data: { status: JornadaStatus.IN_PROGRESS, actualStart: new Date(), startOdometerKm },
  });
}

export async function completeJornada(session: SessionUser, id: string, endOdometerKm: number | null) {
  const jornada = await getJornada(session, id);
  if (session.role === Role.DESK_AGENT) throw new ForbiddenError();
  if (!TRANSITIONS[jornada.status].includes(JornadaStatus.COMPLETED)) {
    throw new ValidationError(`No se puede completar una jornada en estado ${jornada.status}`);
  }
  if (endOdometerKm !== null && jornada.startOdometerKm !== null && endOdometerKm < jornada.startOdometerKm) {
    throw new ValidationError("El odómetro final no puede ser menor al inicial");
  }
  const updated = await prisma.jornadaOperativa.update({
    where: { id },
    data: { status: JornadaStatus.COMPLETED, actualEnd: new Date(), endOdometerKm },
  });
  if (endOdometerKm !== null) {
    await prisma.vehicle.updateMany({
      where: { id: jornada.vehicleId, odometerKm: { lt: endOdometerKm } },
      data: { odometerKm: endOdometerKm },
    });
  }
  return updated;
}

export async function cancelJornada(session: SessionUser, id: string, reason: string | null) {
  requireManager(session);
  const jornada = await getJornada(session, id);
  if (!TRANSITIONS[jornada.status].includes(JornadaStatus.CANCELLED)) {
    throw new ValidationError(`No se puede cancelar una jornada en estado ${jornada.status}`);
  }
  return prisma.jornadaOperativa.update({
    where: { id },
    data: {
      status: JornadaStatus.CANCELLED,
      notes: reason ? `${jornada.notes ? jornada.notes + "\n" : ""}Cancelada: ${reason}` : jornada.notes,
    },
  });
}

// Jornada activa (o planificada para hoy) de una unidad — usada para vincular
// cargas de combustible y por la regla de movimiento no autorizado.
export async function systemActiveJornadaFor(vehicleId: string, at: Date) {
  return prisma.jornadaOperativa.findFirst({
    where: {
      vehicleId,
      OR: [
        { status: JornadaStatus.IN_PROGRESS },
        { status: JornadaStatus.PLANNED, plannedStart: { lte: at }, plannedEnd: { gte: at } },
      ],
    },
    orderBy: { plannedStart: "desc" },
  });
}
