import { startWebsocketConnector } from "@/lib/traccar/websocket-connector";
import { ingestTraccarPositions, pollTraccarPositions } from "@/lib/jobs/poll-traccar-positions";
import { evaluateAlertRules } from "@/lib/jobs/evaluate-alert-rules";
import { processQueuedReportRuns } from "@/lib/jobs/generate-report";
import { systemSetConnectionStatus } from "@/lib/data/traccar-devices";
import { systemSetDriverConnectionStatus } from "@/lib/data/driver-devices";
import { DeviceConnectionStatus } from "@/lib/data/types";

const POLL_INTERVAL_MS = 60_000;
const ALERT_EVAL_INTERVAL_MS = 30_000;
const REPORT_QUEUE_INTERVAL_MS = 5_000;

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
      await safe("alert-rules", evaluateAlertRules);
    },
    onDeviceStatus: async (devices) => {
      for (const d of devices) {
        const status =
          d.status === "online"
            ? DeviceConnectionStatus.ONLINE
            : d.status === "offline"
              ? DeviceConnectionStatus.OFFLINE
              : DeviceConnectionStatus.UNKNOWN;
        const lastSeenAt = d.lastUpdate ? new Date(d.lastUpdate) : undefined;
        // d.id es un traccarId: puede ser un dispositivo de vehículo o de
        // conductor, cada uno resuelve como no-op si no es suyo.
        await safe("ws-device-status", () => systemSetConnectionStatus(d.id, status, lastSeenAt));
        await safe("ws-driver-device-status", () => systemSetDriverConnectionStatus(d.id, status, lastSeenAt));
      }
    },
  });

  setInterval(() => void safe("poll-positions", pollTraccarPositions), POLL_INTERVAL_MS);
  setInterval(() => void safe("alert-rules", evaluateAlertRules), ALERT_EVAL_INTERVAL_MS);
  setInterval(() => void safe("report-queue", processQueuedReportRuns), REPORT_QUEUE_INTERVAL_MS);
  void safe("poll-positions", pollTraccarPositions);
  void safe("alert-rules", evaluateAlertRules);
  void safe("report-queue", processQueuedReportRuns);
}

main();
