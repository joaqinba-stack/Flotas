import { startWebsocketConnector } from "@/lib/traccar/websocket-connector";
import { ingestTraccarPositions, pollTraccarPositions } from "@/lib/jobs/poll-traccar-positions";
import { systemSetConnectionStatus } from "@/lib/data/traccar-devices";
import { DeviceConnectionStatus } from "@/lib/data/types";

const POLL_INTERVAL_MS = 60_000;

async function safe(name: string, fn: () => Promise<unknown>) {
  try {
    await fn();
  } catch (err) {
    console.error(`[worker:${name}]`, err);
  }
}

function main() {
  console.log("[worker] iniciando");

  startWebsocketConnector({
    onPositions: async (positions) => {
      await safe("ws-ingest", () => ingestTraccarPositions(positions));
    },
    onDeviceStatus: async (devices) => {
      for (const d of devices) {
        const status =
          d.status === "online"
            ? DeviceConnectionStatus.ONLINE
            : d.status === "offline"
              ? DeviceConnectionStatus.OFFLINE
              : DeviceConnectionStatus.UNKNOWN;
        await safe("ws-device-status", () =>
          systemSetConnectionStatus(d.id, status, d.lastUpdate ? new Date(d.lastUpdate) : undefined),
        );
      }
    },
  });

  setInterval(() => void safe("poll-positions", pollTraccarPositions), POLL_INTERVAL_MS);
  void safe("poll-positions", pollTraccarPositions);
}

main();
