import { AlertType } from "@prisma/client";
import { systemFindOpenAlert, systemResolveAlert } from "@/lib/data/alerts";
import { buildReconnectionOutcome } from "@/lib/validation/alert-rules";

// Las alertas de desconexión emitidas por este código llevan `lastSeenAt` en
// `details`; las anteriores tienen `details` en null. La distinción importa al
// cerrar: a una alerta vieja habría que escribirle una duración medida hasta
// hoy —días o semanas que no son el corte real— y son 1.133 filas en el VPS,
// nueve cortes de verdad. Esas se consolidan en una migración aparte, no acá.
function emitidaPorEsteMotor(details: unknown): details is { lastSeenAt?: unknown } {
  return (
    !!details && typeof details === "object" && !Array.isArray(details) && "lastSeenAt" in details
  );
}

// Momento en que arrancó el corte. Se usa `lastSeenAt` porque es el instante de
// la última señal; `occurredAt` es cuando el motor se dio cuenta, hasta tres
// intervalos de monitoreo después.
function outageStartedAt(details: { lastSeenAt?: unknown }, occurredAt: Date): Date {
  if (typeof details.lastSeenAt === "string") {
    const parsed = new Date(details.lastSeenAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return occurredAt;
}

// Cierra el episodio de desconexión abierto de un vehículo cuando vuelve a
// haber señal. Sin esto las alertas quedaban NEW para siempre —ninguna de las
// 1.133 del VPS se cerró sola al reconectar— y, ahora que la deduplicación es
// por episodio, una alerta abierta y olvidada taparía todas las desconexiones
// siguientes de esa unidad.
//
// Devuelve la alerta cerrada, o null si no había ninguna abierta que cerrar.
export async function resolveDisconnectionAlert(vehicleId: string, reconnectedAt: Date) {
  const open = await systemFindOpenAlert(vehicleId, AlertType.DEVICE_DISCONNECTED, null);
  if (!open || !emitidaPorEsteMotor(open.details)) return null;

  const startedAt = outageStartedAt(open.details, open.occurredAt);
  const outcome = buildReconnectionOutcome({ message: open.message, startedAt, reconnectedAt });

  return systemResolveAlert(open.id, {
    message: outcome.message,
    details: {
      ...(open.details as Record<string, unknown>),
      reconnectedAt: reconnectedAt.toISOString(),
      outageMs: outcome.outageMs,
      outageLabel: outcome.outageLabel,
      // Deja rastro de que el cierre lo hizo el motor y no una persona:
      // acknowledgedBy queda null y de otro modo no se distinguiría.
      resolvedBy: "sistema",
    },
  });
}
