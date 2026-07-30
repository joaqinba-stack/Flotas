// Reglas puras del motor de alertas — sin acceso a datos, para que sean
// testeables de forma aislada. lib/jobs/evaluate-alert-rules.ts las orquesta.

import { AlertType } from "@/lib/data/types";
import { fmtDateTime } from "@/lib/format";

export const DEFAULT_SPEED_LIMIT_KMH = 120;
export const DEFAULT_DISCONNECTION_GRACE_MULTIPLIER = 3;
export const UNAUTHORIZED_MOVEMENT_SPEED_THRESHOLD_KMH = 5;

export function isSpeeding(speedKmh: number, limitKmh: number = DEFAULT_SPEED_LIMIT_KMH): boolean {
  return speedKmh > limitKmh;
}

// Un dispositivo se considera desconectado cuando no reporta por más de N
// veces su intervalo de monitoreo configurado (tolera jitter de red normal).
export function isDeviceDisconnected(
  lastSeenAt: Date | null,
  monitoringIntervalSeconds: number,
  now: Date,
  graceMultiplier: number = DEFAULT_DISCONNECTION_GRACE_MULTIPLIER,
): boolean {
  if (!lastSeenAt) return true;
  const thresholdMs = monitoringIntervalSeconds * graceMultiplier * 1000;
  return now.getTime() - lastSeenAt.getTime() > thresholdMs;
}

// Tipos de alerta cuya condición persiste en el tiempo en vez de ser un hecho
// puntual. Para estos no corresponde deduplicar por ventana temporal: mientras
// la alerta siga abierta, el episodio es el mismo y no hay que crear otra.
//
// DEVICE_DISCONNECTED es el caso que lo motivó. El motor reevalúa cada 30 s y
// la ventana de 15 min solo tapaba las repeticiones inmediatas: en la base del
// VPS quedaron 1.133 alertas para 9 cortes reales (AMINCITO 670 por 2 cortes,
// ROQUE 463 por 7). SPEEDING o las geocercas sí son hechos puntuales —ahí la
// ventana es lo correcto y se mantiene.
const PERSISTENT_ALERT_TYPES: readonly string[] = [AlertType.DEVICE_DISCONNECTED];

export function isPersistentAlertType(type: AlertType): boolean {
  return PERSISTENT_ALERT_TYPES.includes(type);
}

// Duración de un corte de señal en texto corto: "4 d 6 h", "3 h 12 min", "45 min".
// No se reusa fmtDuration de lib/telemetry/distance porque los cortes reales
// llegan a varios días y "102 h 30 min" no se lee como cuatro días.
export function fmtOutage(ms: number): string {
  const totalMin = Math.floor(ms / 60_000);
  if (totalMin < 1) return "menos de 1 min";
  const dias = Math.floor(totalMin / 1440);
  const horas = Math.floor((totalMin % 1440) / 60);
  const min = totalMin % 60;
  if (dias > 0) return `${dias} d ${horas} h`;
  if (horas > 0) return `${horas} h ${min} min`;
  return `${min} min`;
}

// Cierre de un episodio de desconexión. La duración del corte se escribe en el
// mensaje —es lo único que se ve en la pantalla de alertas— y también vuelve en
// crudo para guardarla en `details`, que es donde sirve para reportes.
export function buildReconnectionOutcome(input: {
  message: string;
  startedAt: Date;
  reconnectedAt: Date;
}): { message: string; outageMs: number; outageLabel: string } {
  // El corte no puede durar negativo: si el reloj de Traccar viene corrido
  // respecto del nuestro, la resta puede dar menos que cero.
  const outageMs = Math.max(0, input.reconnectedAt.getTime() - input.startedAt.getTime());
  const outageLabel = fmtOutage(outageMs);
  return {
    message: `${input.message} — señal restablecida el ${fmtDateTime(input.reconnectedAt)} tras ${outageLabel} sin señal`,
    outageMs,
    outageLabel,
  };
}

// Movimiento con ignición encendida (o velocidad relevante si no hay dato de
// ignición) sin una jornada operativa activa/planificada para ese horario.
export function isUnauthorizedMovement(input: {
  speedKmh: number;
  ignition: boolean | null;
  hasActiveJornada: boolean;
}): boolean {
  if (input.hasActiveJornada) return false;
  const isMoving =
    input.ignition === true || (input.ignition === null && input.speedKmh > UNAUTHORIZED_MOVEMENT_SPEED_THRESHOLD_KMH);
  return isMoving;
}

export type GeofenceTransition = "ENTER" | "EXIT" | null;

export function geofenceTransition(wasInside: boolean, isInside: boolean): GeofenceTransition {
  if (!wasInside && isInside) return "ENTER";
  if (wasInside && !isInside) return "EXIT";
  return null;
}
