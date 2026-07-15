// Reglas puras del motor de alertas — sin acceso a datos, para que sean
// testeables de forma aislada. lib/jobs/evaluate-alert-rules.ts las orquesta.

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
