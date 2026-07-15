import { AlertSeverity, AlertType } from "@prisma/client";
import { systemListDevices } from "@/lib/data/traccar-devices";
import { systemLatestTwoPositions } from "@/lib/data/positions";
import { systemActiveGeofencesForVehicle } from "@/lib/data/geofences";
import { systemActiveJornadaFor } from "@/lib/data/jornadas";
import { pointInPolygon } from "@/lib/validation/geofence-geometry";
import {
  isSpeeding,
  isDeviceDisconnected,
  isUnauthorizedMovement,
  geofenceTransition,
  DEFAULT_SPEED_LIMIT_KMH,
} from "@/lib/validation/alert-rules";
import { raiseAlert } from "@/lib/jobs/raise-alert";

function speedLimitKmh(): number {
  const raw = Number(process.env.SPEED_LIMIT_KMH);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_SPEED_LIMIT_KMH;
}

// Corre periódicamente (o disparado tras cada ingesta de posiciones) y evalúa
// las cuatro reglas del pliego sobre el estado más reciente de cada unidad.
export async function evaluateAlertRules() {
  const devices = await systemListDevices();
  const now = new Date();

  for (const device of devices) {
    if (isDeviceDisconnected(device.lastSeenAt, device.monitoringIntervalSeconds, now)) {
      await raiseAlert({
        type: AlertType.DEVICE_DISCONNECTED,
        severity: AlertSeverity.WARNING,
        vehicleId: device.vehicleId,
        message: `Dispositivo ${device.name} sin señal desde ${device.lastSeenAt?.toISOString() ?? "nunca"}`,
        occurredAt: now,
      });
    }

    const [latest, previous] = await systemLatestTwoPositions(device.vehicleId);
    if (!latest) continue;

    if (isSpeeding(latest.speedKmh, speedLimitKmh())) {
      await raiseAlert({
        type: AlertType.SPEEDING,
        severity: AlertSeverity.WARNING,
        vehicleId: device.vehicleId,
        positionId: latest.id,
        message: `Velocidad ${latest.speedKmh.toFixed(0)} km/h supera el límite de ${speedLimitKmh()} km/h`,
        occurredAt: latest.recordedAt,
      });
    }

    const activeJornada = await systemActiveJornadaFor(device.vehicleId, latest.recordedAt);
    if (
      isUnauthorizedMovement({
        speedKmh: latest.speedKmh,
        ignition: latest.ignition,
        hasActiveJornada: activeJornada !== null,
      })
    ) {
      await raiseAlert({
        type: AlertType.UNAUTHORIZED_MOVEMENT,
        severity: AlertSeverity.CRITICAL,
        vehicleId: device.vehicleId,
        positionId: latest.id,
        message: "Movimiento detectado sin jornada operativa activa",
        occurredAt: latest.recordedAt,
      });
    }

    const geofences = await systemActiveGeofencesForVehicle(device.vehicleId);
    for (const geofence of geofences) {
      const polygon = geofence.polygon as Array<[number, number]>;
      const isInside = pointInPolygon([latest.latitude, latest.longitude], polygon);
      const wasInside = previous ? pointInPolygon([previous.latitude, previous.longitude], polygon) : isInside;
      const transition = geofenceTransition(wasInside, isInside);
      if (transition) {
        await raiseAlert({
          type: transition === "ENTER" ? AlertType.GEOFENCE_ENTER : AlertType.GEOFENCE_EXIT,
          severity: AlertSeverity.INFO,
          vehicleId: device.vehicleId,
          geofenceId: geofence.id,
          positionId: latest.id,
          message: `${transition === "ENTER" ? "Ingresó a" : "Salió de"} la geocerca ${geofence.name}`,
          occurredAt: latest.recordedAt,
        });
      }
    }
  }
}
