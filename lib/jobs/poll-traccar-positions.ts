import { systemListDevices, systemSyncPendingDevices } from "@/lib/data/traccar-devices";
import { systemIngestPositions, systemLatestPositionAt } from "@/lib/data/positions";
import { traccarClient, TraccarUnavailableError, type TraccarPosition } from "@/lib/traccar/client";
import { normalizePosition } from "@/lib/traccar/normalize";

const DEFAULT_LOOKBACK_MS = 60 * 60 * 1000;

export async function ingestTraccarPositions(positions: TraccarPosition[]) {
  const devices = await systemListDevices();
  const byTraccarId = new Map(devices.filter((d) => d.traccarId !== null).map((d) => [d.traccarId!, d]));
  const receivedAt = new Date();
  const rows = positions
    .map((p) => {
      const device = byTraccarId.get(p.deviceId);
      if (!device) return null;
      return { ...normalizePosition(p, receivedAt), vehicleId: device.vehicleId };
    })
    .filter((r) => r !== null);
  return systemIngestPositions(rows);
}

// Respaldo de reconciliación: cubre huecos si el WebSocket estuvo caído y
// levanta el histórico bufferizado que el dispositivo descargó offline.
export async function pollTraccarPositions() {
  try {
    await systemSyncPendingDevices();
    const devices = await systemListDevices();
    const now = new Date();
    for (const device of devices) {
      if (device.traccarId === null) continue;
      const lastAt = await systemLatestPositionAt(device.vehicleId);
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
