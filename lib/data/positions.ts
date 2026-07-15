import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { getVehicle, vehicleScopeWhere } from "./vehicles";
import type { NormalizedPosition } from "@/lib/traccar/normalize";

export async function getVehiclePositions(
  session: SessionUser,
  vehicleId: string,
  range?: { from?: Date; to?: Date; limit?: number },
) {
  await getVehicle(session, vehicleId); // valida scope o lanza 404
  const where: Prisma.PositionSnapshotWhereInput = { vehicleId };
  if (range?.from || range?.to) {
    where.recordedAt = { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };
  }
  return prisma.positionSnapshot.findMany({
    where,
    orderBy: { recordedAt: "desc" },
    take: range?.limit ?? 500,
  });
}

// Última posición conocida de cada vehículo dentro del alcance del viewer.
export async function latestPositions(session: SessionUser) {
  return prisma.positionSnapshot.findMany({
    where: { vehicle: { AND: [vehicleScopeWhere(session)] } },
    orderBy: { recordedAt: "desc" },
    distinct: ["vehicleId"],
    include: {
      vehicle: {
        select: {
          id: true,
          plate: true,
          status: true,
          currentDriver: { select: { firstName: true, lastName: true } },
          traccarDevice: { select: { connectionStatus: true } },
        },
      },
    },
  });
}

// --- Ingesta de sistema (worker/webhook): no hay sesión de usuario ---

export async function systemIngestPositions(
  rows: Array<NormalizedPosition & { vehicleId: string }>,
) {
  if (rows.length === 0) return { count: 0 };
  const result = await prisma.positionSnapshot.createMany({
    data: rows.map((r) => ({
      vehicleId: r.vehicleId,
      traccarPositionId: r.traccarPositionId,
      latitude: r.latitude,
      longitude: r.longitude,
      speedKmh: r.speedKmh,
      course: r.course,
      ignition: r.ignition,
      odometerKm: r.odometerKm,
      recordedAt: r.recordedAt,
      receivedAt: r.receivedAt,
      isBuffered: r.isBuffered,
      attributes: r.attributes as Prisma.InputJsonValue,
    })),
    skipDuplicates: true,
  });

  const byVehicle = new Map<string, Date>();
  for (const r of rows) {
    const prev = byVehicle.get(r.vehicleId);
    if (!prev || r.recordedAt > prev) byVehicle.set(r.vehicleId, r.recordedAt);
  }
  for (const [vehicleId, lastSeenAt] of byVehicle) {
    await prisma.traccarDevice.updateMany({
      where: { vehicleId, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: lastSeenAt } }] },
      data: { lastSeenAt, connectionStatus: "ONLINE" },
    });
  }
  return result;
}

export async function systemLatestPositionAt(vehicleId: string): Promise<Date | null> {
  const last = await prisma.positionSnapshot.findFirst({
    where: { vehicleId },
    orderBy: { recordedAt: "desc" },
    select: { recordedAt: true },
  });
  return last?.recordedAt ?? null;
}

// [más reciente, anterior] — usado por el motor de reglas para detectar
// transiciones de geocerca comparando dos posiciones consecutivas.
export async function systemLatestTwoPositions(vehicleId: string) {
  return prisma.positionSnapshot.findMany({
    where: { vehicleId },
    orderBy: { recordedAt: "desc" },
    take: 2,
  });
}
