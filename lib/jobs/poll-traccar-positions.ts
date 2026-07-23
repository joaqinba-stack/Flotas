import { systemListDevices, systemSyncPendingDevices } from "@/lib/data/traccar-devices";
import { systemListDriverDevices, systemSyncPendingDriverDevices } from "@/lib/data/driver-devices";
import {
  systemIngestPositions,
  systemIngestDriverPositions,
  systemLatestPositionAt,
  systemLatestDriverPositionAt,
} from "@/lib/data/positions";
import { traccarClient, TraccarUnavailableError, type TraccarPosition } from "@/lib/traccar/client";
import { normalizePosition } from "@/lib/traccar/normalize";

const DEFAULT_LOOKBACK_MS = 60 * 60 * 1000;

// Un mismo lote de posiciones de Traccar puede traer eventos de vehículos y
// de celulares de conductores mezclados: son dos tablas de dispositivos
// separadas (cada traccarId de Traccar es dueño de un solo registro, en una
// sola de las dos tablas), así que hay que resolver contra ambas.
export async function ingestTraccarPositions(positions: TraccarPosition[]) {
  const [vehicleDevices, driverDevices] = await Promise.all([systemListDevices(), systemListDriverDevices()]);
  const byVehicleTraccarId = new Map(
    vehicleDevices.filter((d) => d.traccarId !== null).map((d) => [d.traccarId!, d]),
  );
  const byDriverTraccarId = new Map(
    driverDevices.filter((d) => d.traccarId !== null).map((d) => [d.traccarId!, d]),
  );
  const receivedAt = new Date();

  const vehicleRows = positions
    .map((p) => {
      const device = byVehicleTraccarId.get(p.deviceId);
      if (!device) return null;
      return { ...normalizePosition(p, receivedAt), vehicleId: device.vehicleId };
    })
    .filter((r) => r !== null);

  const driverRows = positions
    .map((p) => {
      const device = byDriverTraccarId.get(p.deviceId);
      if (!device) return null;
      return { ...normalizePosition(p, receivedAt), driverId: device.driverId };
    })
    .filter((r) => r !== null);

  const [vehicleResult, driverResult] = await Promise.all([
    systemIngestPositions(vehicleRows),
    systemIngestDriverPositions(driverRows),
  ]);
  return { count: vehicleResult.count + driverResult.count };
}

// Respaldo de reconciliación: cubre huecos si el WebSocket estuvo caído y
// levanta el histórico bufferizado que el dispositivo descargó offline.
export async function pollTraccarPositions() {
  try {
    await systemSyncPendingDevices();
    await systemSyncPendingDriverDevices();
    const now = new Date();

    const vehicleDevices = await systemListDevices();
    for (const device of vehicleDevices) {
      if (device.traccarId === null) continue;
      const lastAt = await systemLatestPositionAt(device.vehicleId);
      const from = lastAt ?? new Date(now.getTime() - DEFAULT_LOOKBACK_MS);
      const positions = await traccarClient.getPositions(device.traccarId, from, now);
      if (positions.length > 0) await ingestTraccarPositions(positions);
    }

    const driverDevices = await systemListDriverDevices();
    for (const device of driverDevices) {
      if (device.traccarId === null) continue;
      const lastAt = await systemLatestDriverPositionAt(device.driverId);
      const from = lastAt ?? new Date(now.getTime() - DEFAULT_LOOKBACK_MS);
      const positions = await traccarClient.getPositions(device.traccarId, from, now);
      if (positions.length > 0) await ingestTraccarPositions(positions);
    }
  } catch (err) {
    if (err instanceof TraccarUnavailableError) {
      console.warn(`[poll-traccar] ${err.message}; se reintenta en el próximo ciclo`);
      return;
    }
    throw err;
  }
}
