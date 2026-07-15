import { Prisma, Role, DeskChannel, DeskTicketStatus, IncidentUrgency } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";

// Los tickets sin vehículo (consulta general, no vinculada a una unidad) son
// visibles para toda la mesa; los vinculados a un vehículo se scopean por la
// unidad de ese vehículo, igual que el resto de las entidades operativas.
function ticketScopeWhere(session: SessionUser): Prisma.DeskTicketWhereInput {
  if (session.role === Role.ADMIN) return {};
  if (session.role === Role.DESK_AGENT || session.role === Role.SUPERVISOR) {
    return {
      OR: [{ vehicleId: null }, { vehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput }],
    };
  }
  throw new ForbiddenError();
}

function requireDeskAccess(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.DESK_AGENT) {
    throw new ForbiddenError();
  }
}

export type DeskTicketInput = {
  channel: DeskChannel;
  subject: string;
  description: string;
  priority: IncidentUrgency;
  requesterName: string;
  requesterContact: string | null;
  vehicleId: string | null;
  linkedIncidentId: string | null;
  linkedJornadaId: string | null;
};

export async function listDeskTickets(
  session: SessionUser,
  filters?: { status?: DeskTicketStatus; channel?: DeskChannel },
) {
  const where: Prisma.DeskTicketWhereInput = { AND: [ticketScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.channel) where.channel = filters.channel;
  return prisma.deskTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      vehicle: { select: { id: true, plate: true } },
      assignedTo: { select: { name: true } },
      linkedIncident: { select: { id: true, code: true } },
      linkedJornada: { select: { id: true, purpose: true } },
    },
  });
}

export async function getDeskTicket(session: SessionUser, id: string) {
  const ticket = await prisma.deskTicket.findFirst({
    where: { id, AND: [ticketScopeWhere(session)] },
    include: {
      vehicle: { select: { id: true, plate: true } },
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true } },
      linkedIncident: { select: { id: true, code: true, title: true, status: true } },
      linkedJornada: { select: { id: true, purpose: true, status: true } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!ticket) throw new NotFoundError("Ticket no encontrado");
  return ticket;
}

export async function createDeskTicket(session: SessionUser, input: DeskTicketInput) {
  requireDeskAccess(session);
  if (input.vehicleId) await getVehicle(session, input.vehicleId);
  if (input.linkedJornadaId) {
    const jornada = await prisma.jornadaOperativa.findUnique({ where: { id: input.linkedJornadaId } });
    if (!jornada) throw new ValidationError("La jornada indicada no existe");
    if (input.vehicleId && jornada.vehicleId !== input.vehicleId) {
      throw new ValidationError("La jornada no corresponde al vehículo indicado");
    }
  }
  if (input.linkedIncidentId) {
    const incident = await prisma.incident.findUnique({ where: { id: input.linkedIncidentId } });
    if (!incident) throw new ValidationError("La incidencia indicada no existe");
  }
  return prisma.deskTicket.create({
    data: { ...input, createdById: session.userId },
  });
}

export async function assignDeskTicket(session: SessionUser, id: string, assignedToId: string | null) {
  requireDeskAccess(session);
  await getDeskTicket(session, id);
  if (assignedToId) {
    const agent = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!agent || (agent.role !== Role.DESK_AGENT && agent.role !== Role.ADMIN)) {
      throw new ValidationError("El usuario indicado no es agente de mesa");
    }
  }
  return prisma.deskTicket.update({ where: { id }, data: { assignedToId } });
}

const TRANSITIONS: Record<DeskTicketStatus, DeskTicketStatus[]> = {
  OPEN: [DeskTicketStatus.IN_PROGRESS, DeskTicketStatus.RESOLVED, DeskTicketStatus.CLOSED],
  IN_PROGRESS: [DeskTicketStatus.RESOLVED, DeskTicketStatus.CLOSED],
  RESOLVED: [DeskTicketStatus.CLOSED, DeskTicketStatus.IN_PROGRESS],
  CLOSED: [],
};

export async function updateDeskTicketStatus(session: SessionUser, id: string, toStatus: DeskTicketStatus) {
  requireDeskAccess(session);
  const ticket = await getDeskTicket(session, id);
  if (!TRANSITIONS[ticket.status].includes(toStatus)) {
    throw new ValidationError(`Transición inválida ${ticket.status} → ${toStatus}`);
  }
  return prisma.deskTicket.update({
    where: { id },
    data: {
      status: toStatus,
      resolvedAt: toStatus === DeskTicketStatus.RESOLVED && !ticket.resolvedAt ? new Date() : undefined,
    },
  });
}

export async function addDeskTicketNote(session: SessionUser, ticketId: string, body: string) {
  requireDeskAccess(session);
  await getDeskTicket(session, ticketId);
  return prisma.deskTicketNote.create({
    data: { ticketId, authorId: session.userId, body },
  });
}

export async function listDeskAgents(session: SessionUser) {
  requireDeskAccess(session);
  return prisma.user.findMany({
    where: { role: { in: [Role.DESK_AGENT, Role.ADMIN] }, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}
