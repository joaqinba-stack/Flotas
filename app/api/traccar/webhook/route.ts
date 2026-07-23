import { AlertSeverity, AlertType, DeviceConnectionStatus } from "@/lib/data/types";
import { systemFindByTraccarId, systemSetConnectionStatus } from "@/lib/data/traccar-devices";
import { systemFindDriverByTraccarId, systemSetDriverConnectionStatus } from "@/lib/data/driver-devices";
import { raiseAlert } from "@/lib/jobs/raise-alert";

type TraccarWebhookEvent = {
  type: string;
  deviceId: number;
  eventTime?: string;
  attributes?: Record<string, unknown>;
};

function isAuthorized(req: Request): boolean {
  const expected = process.env.TRACCAR_WEBHOOK_SECRET;
  if (!expected) return true; // dev sin secreto configurado
  return req.headers.get("x-traccar-secret") === expected;
}

// Traduce las alertas nativas de Traccar (desconexión, geocercas propias del
// servidor, exceso de velocidad si el dispositivo lo soporta) directo a
// Alert. Movimiento no autorizado NO llega por acá: lo evalúa el motor de
// reglas propio (lib/jobs/evaluate-alert-rules), que sí conoce JornadaOperativa.
export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401 });
  }

  const event: TraccarWebhookEvent = await req.json();
  const device = await systemFindByTraccarId(event.deviceId);
  if (!device) {
    // No es un dispositivo de vehículo: puede ser el celular de un conductor.
    // Esos solo tienen estado de conexión (no hay vehicleId para colgar un Alert).
    const driverDevice = await systemFindDriverByTraccarId(event.deviceId);
    if (!driverDevice) {
      return new Response(JSON.stringify({ ok: true, ignored: "device desconocido" }));
    }
    const occurredAt = event.eventTime ? new Date(event.eventTime) : new Date();
    if (event.type === "deviceOffline") {
      await systemSetDriverConnectionStatus(event.deviceId, DeviceConnectionStatus.OFFLINE);
    } else if (event.type === "deviceOnline") {
      await systemSetDriverConnectionStatus(event.deviceId, DeviceConnectionStatus.ONLINE, occurredAt);
    }
    return new Response(JSON.stringify({ ok: true }));
  }

  const occurredAt = event.eventTime ? new Date(event.eventTime) : new Date();

  switch (event.type) {
    case "deviceOffline":
      await systemSetConnectionStatus(event.deviceId, DeviceConnectionStatus.OFFLINE);
      await raiseAlert({
        type: AlertType.DEVICE_DISCONNECTED,
        severity: AlertSeverity.WARNING,
        vehicleId: device.vehicleId,
        message: `Traccar reportó desconexión del dispositivo ${device.name}`,
        occurredAt,
      });
      break;
    case "deviceOnline":
      await systemSetConnectionStatus(event.deviceId, DeviceConnectionStatus.ONLINE, occurredAt);
      break;
    case "geofenceEnter":
    case "geofenceExit":
      await raiseAlert({
        type: event.type === "geofenceEnter" ? AlertType.GEOFENCE_ENTER : AlertType.GEOFENCE_EXIT,
        severity: AlertSeverity.INFO,
        vehicleId: device.vehicleId,
        message: `Evento nativo de Traccar: ${event.type}`,
        details: event.attributes,
        occurredAt,
      });
      break;
    case "alarm":
      if (event.attributes?.alarm === "overspeed") {
        await raiseAlert({
          type: AlertType.SPEEDING,
          severity: AlertSeverity.WARNING,
          vehicleId: device.vehicleId,
          message: "Alarma de exceso de velocidad reportada por el dispositivo",
          details: event.attributes,
          occurredAt,
        });
      }
      break;
    default:
      break;
  }

  return new Response(JSON.stringify({ ok: true }));
}
