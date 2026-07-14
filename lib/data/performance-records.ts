import { Role, PerformanceKind } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { getDriver } from "./drivers";

// Legajo histórico de desempeño: solo lectura + alta (append-only).

export async function listPerformanceRecords(session: SessionUser, driverId: string) {
  if (session.role === Role.DRIVER && session.driverId !== driverId) {
    throw new ForbiddenError();
  }
  await getDriver(session, driverId); // valida scope
  return prisma.driverPerformanceRecord.findMany({
    where: { driverId },
    orderBy: { createdAt: "desc" },
    include: {
      recordedBy: { select: { name: true } },
      jornada: { select: { id: true, purpose: true, plannedStart: true } },
    },
  });
}

export async function addPerformanceRecord(
  session: SessionUser,
  driverId: string,
  input: { kind: PerformanceKind; summary: string; details: string | null; jornadaId: string | null },
) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
  await getDriver(session, driverId);
  return prisma.driverPerformanceRecord.create({
    data: {
      driverId,
      kind: input.kind,
      summary: input.summary,
      details: input.details,
      jornadaId: input.jornadaId,
      recordedById: session.userId,
    },
  });
}
