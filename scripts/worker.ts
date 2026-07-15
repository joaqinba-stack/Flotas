import { startWebsocketConnector } from "@/lib/traccar/websocket-connector";
import { ingestTraccarPositions, pollTraccarPositions } from "@/lib/jobs/poll-traccar-positions";
import { evaluateAlertRules } from "@/lib/jobs/evaluate-alert-rules";
import { processQueuedReportRuns } from "@/lib/jobs/generate-report";
import { systemSetConnectionStatus } from "@/lib/data/traccar-devices";
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
        await safe("ws-device-status", () =>
          systemSetConnectionStatus(d.id, status, d.lastUpdate ? new Date(d.lastUpdate) : undefined),
        );
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
