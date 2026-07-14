import { Prisma, Role, IncidentStatus, IncidentUrgency } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";
import { saveUpload } from "@/lib/storage";

function incidentScopeWhere(session: SessionUser): Prisma.IncidentWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { driverId: session.driverId };
  }
  if (session.role === Role.SUPPLIER) {
    // Los proveedores acceden a incidencias solo a través de sus órdenes
    // (lib/data/supplier-orders incluye un resumen del incidente).
    throw new ForbiddenError();
  }
  return { vehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput };
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type IncidentInput = {
  vehicleId: string;
  jornadaId: string | null;
  title: string;
  description: string;
  category: string;
  urgency: IncidentUrgency;
  occurredAt: Date;
};

export async function listIncidents(
  session: SessionUser,
  filters?: { status?: IncidentStatus; urgency?: IncidentUrgency; vehicleId?: string },
) {
  const where: Prisma.IncidentWhereInput = { AND: [incidentScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.urgency) where.urgency = filters.urgency;
  if (filters?.vehicleId) where.vehicleId = filters.vehicleId;
  return prisma.incident.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: 300,
    include: {
      vehicle: { select: { id: true, plate: true } },
      driver: { select: { firstName: true, lastName: true } },
      jornada: { select: { id: true, purpose: true } },
      _count: { select: { notes: true, attachments: true, serviceOrders: true } },
    },
  });
}

export async function getIncident(session: SessionUser, id: string) {
  const incident = await prisma.incident.findFirst({
    where: { id, AND: [incidentScopeWhere(session)] },
    include: {
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      jornada: { select: { id: true, purpose: true } },
      reportedBy: { select: { name: true } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
      attachments: { orderBy: { createdAt: "asc" }, include: { uploadedBy: { select: { name: true } } } },
      serviceOrders: {
        orderBy: { createdAt: "asc" },
        include: { supplier: { select: { id: true, name: true } } },
      },
    },
  });
  if (!incident) throw new NotFoundError("Incidencia no encontrada");
  return incident;
}

export async function createIncident(session: SessionUser, input: IncidentInput) {
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  const vehicle = await getVehicle(session, input.vehicleId);

  if (input.jornadaId) {
    const jornada = await prisma.jornadaOperativa.findUnique({ where: { id: input.jornadaId } });
    if (!jornada || jornada.vehicleId !== input.vehicleId) {
      throw new ValidationError("La jornada indicada no corresponde al vehículo");
    }
    if (session.role === Role.DRIVER && jornada.driverId !== session.driverId) {
      throw new ForbiddenError();
    }
  }

  const driverId = session.role === Role.DRIVER ? session.driverId : (vehicle.currentDriverId ?? null);

  return prisma.incident.create({
    data: {
      vehicleId: input.vehicleId,
      jornadaId: input.jornadaId,
      driverId,
      title: input.title,
      description: input.description,
      category: input.category,
      urgency: input.urgency,
      occurredAt: input.occurredAt,
      reportedById: session.userId,
    },
  });
}

const TRANSITIONS: Record<IncidentStatus, IncidentStatus[]> = {
  OPEN: [IncidentStatus.IN_PROGRESS, IncidentStatus.WAITING_SUPPLIER, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  IN_PROGRESS: [IncidentStatus.WAITING_SUPPLIER, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  WAITING_SUPPLIER: [IncidentStatus.IN_PROGRESS, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
  RESOLVED: [IncidentStatus.CLOSED, IncidentStatus.IN_PROGRESS],
  CLOSED: [],
};

export async function classifyIncident(
  session: SessionUser,
  id: string,
  input: { urgency?: IncidentUrgency; category?: string; status?: IncidentStatus },
) {
  requireManager(session);
  const incident = await getIncident(session, id);
  if (input.status && input.status !== incident.status && !TRANSITIONS[incident.status].includes(input.status)) {
    throw new ValidationError(`Transición inválida ${incident.status} → ${input.status}`);
  }
  return prisma.incident.update({
    where: { id },
    data: {
      urgency: input.urgency,
      category: input.category,
      status: input.status,
      resolvedAt:
        input.status === IncidentStatus.RESOLVED && !incident.resolvedAt ? new Date() : undefined,
    },
  });
}

export async function addIncidentNote(session: SessionUser, incidentId: string, body: string) {
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  await getIncident(session, incidentId);
  return prisma.incidentNote.create({
    data: { incidentId, authorId: session.userId, body },
  });
}

export async function addIncidentAttachment(session: SessionUser, incidentId: string, file: File) {
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  await getIncident(session, incidentId);
  if (file.size === 0) throw new ValidationError("Archivo vacío");
  if (file.size > 20 * 1024 * 1024) throw new ValidationError("El archivo supera 20 MB");
  const stored = await saveUpload(`incidents/${incidentId}`, file);
  return prisma.incidentAttachment.create({
    data: { incidentId, uploadedById: session.userId, ...stored },
  });
}

export async function getIncidentAttachment(session: SessionUser, incidentId: string, attachmentId: string) {
  await getIncident(session, incidentId);
  const attachment = await prisma.incidentAttachment.findFirst({
    where: { id: attachmentId, incidentId },
  });
  if (!attachment) throw new NotFoundError("Adjunto no encontrado");
  return attachment;
}
