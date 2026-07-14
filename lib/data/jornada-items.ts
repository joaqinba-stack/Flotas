import { Role, ViaticoStatus, PermitStatus, JornadaStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getJornada } from "./jornadas";

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

// getJornada ya aplica el scope del viewer (DRIVER solo jornadas propias),
// por eso todas las mutaciones parten de ahí.
async function getWritableJornada(session: SessionUser, jornadaId: string) {
  if (session.role === Role.DESK_AGENT) throw new ForbiddenError();
  const jornada = await getJornada(session, jornadaId);
  if (jornada.status === JornadaStatus.CANCELLED) {
    throw new ValidationError("La jornada está cancelada");
  }
  return jornada;
}

// --- Viáticos ---

export async function addViatico(
  session: SessionUser,
  jornadaId: string,
  input: { concept: string; amount: number },
) {
  const jornada = await getWritableJornada(session, jornadaId);
  return prisma.viatico.create({
    data: {
      jornadaId,
      driverId: jornada.driverId,
      concept: input.concept,
      amount: input.amount,
      createdById: session.userId,
    },
  });
}

export async function resolveViatico(
  session: SessionUser,
  id: string,
  decision: "APPROVED" | "REJECTED" | "PAID",
) {
  requireManager(session);
  const viatico = await prisma.viatico.findUnique({ where: { id } });
  if (!viatico) throw new NotFoundError("Viático no encontrado");
  await getJornada(session, viatico.jornadaId);
  if (decision === "PAID" && viatico.status !== ViaticoStatus.APPROVED) {
    throw new ValidationError("Solo se puede pagar un viático aprobado");
  }
  return prisma.viatico.update({
    where: { id },
    data: { status: ViaticoStatus[decision], approvedById: session.userId },
  });
}

// --- Permisos ---

export async function addPermit(
  session: SessionUser,
  jornadaId: string,
  input: { type: string; description: string },
) {
  const jornada = await getWritableJornada(session, jornadaId);
  return prisma.permit.create({
    data: {
      jornadaId,
      driverId: jornada.driverId,
      type: input.type,
      description: input.description,
      requestedById: session.userId,
    },
  });
}

export async function resolvePermit(session: SessionUser, id: string, decision: "APPROVED" | "REJECTED") {
  requireManager(session);
  const permit = await prisma.permit.findUnique({ where: { id } });
  if (!permit) throw new NotFoundError("Permiso no encontrado");
  await getJornada(session, permit.jornadaId);
  if (permit.status !== PermitStatus.PENDING) {
    throw new ValidationError("El permiso ya fue resuelto");
  }
  return prisma.permit.update({
    where: { id },
    data: { status: PermitStatus[decision], approvedById: session.userId },
  });
}

// --- Novedades ---

export async function addNovedad(
  session: SessionUser,
  jornadaId: string,
  input: { category: string; description: string; occurredAt: Date },
) {
  await getWritableJornada(session, jornadaId);
  return prisma.novedad.create({
    data: {
      jornadaId,
      category: input.category,
      description: input.description,
      occurredAt: input.occurredAt,
      reportedById: session.userId,
    },
  });
}
