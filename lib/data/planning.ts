import { Role, JornadaStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError } from "@/lib/errors";
import { vehicleScopeWhere } from "./vehicles";
import { estimateSupplyNeed } from "@/lib/validation/trip-planning";

const LOOKAHEAD_DAYS = 14;
const HISTORY_SAMPLE_SIZE = 10;

export type TripPlanningRow = {
  vehicleId: string;
  plate: string;
  upcomingJornadas: Array<{ id: string; purpose: string; plannedStart: Date; driver: string }>;
  avgLitersPerLoad: number | null;
  avgIntervalDays: number | null;
  daysSinceLastLoad: number | null;
  supplyRisk: boolean;
};

// Consumida por la mesa 24/7 para anticipar necesidades de combustible frente
// a jornadas ya planificadas, a partir del patrón histórico propio de cada
// unidad (sin telemetría de consumo real por modelo en este entorno).
export async function tripPlanningOverview(session: SessionUser): Promise<TripPlanningRow[]> {
  if (session.role === Role.DRIVER || session.role === Role.SUPPLIER) throw new ForbiddenError();

  const now = new Date();
  const horizon = new Date(now.getTime() + LOOKAHEAD_DAYS * 86_400_000);

  const vehicles = await prisma.vehicle.findMany({
    where: { AND: [vehicleScopeWhere(session)] },
    select: {
      id: true,
      plate: true,
      jornadas: {
        where: { status: JornadaStatus.PLANNED, plannedStart: { gte: now, lte: horizon } },
        orderBy: { plannedStart: "asc" },
        select: {
          id: true,
          purpose: true,
          plannedStart: true,
          driver: { select: { firstName: true, lastName: true } },
        },
      },
      fuelLoads: {
        where: { validationStatus: { not: "REJECTED" } },
        orderBy: { loadedAt: "desc" },
        take: HISTORY_SAMPLE_SIZE,
        select: { loadedAt: true, liters: true },
      },
    },
  });

  return vehicles
    .filter((v) => v.jornadas.length > 0)
    .map((v) => {
      const estimate = estimateSupplyNeed(
        v.fuelLoads.map((f) => ({ loadedAt: f.loadedAt, liters: Number(f.liters) })),
        now,
      );
      return {
        vehicleId: v.id,
        plate: v.plate,
        upcomingJornadas: v.jornadas.map((j) => ({
          id: j.id,
          purpose: j.purpose,
          plannedStart: j.plannedStart,
          driver: `${j.driver.lastName}, ${j.driver.firstName}`,
        })),
        ...estimate,
      };
    })
    .sort((a, b) => Number(b.supplyRisk) - Number(a.supplyRisk));
}
