import WebSocket from "ws";
import { traccarClient, TraccarUnavailableError, type TraccarPosition } from "./client";

type ConnectorHandlers = {
  onPositions: (positions: TraccarPosition[]) => Promise<void>;
  onDeviceStatus?: (devices: Array<{ id: number; status?: string; lastUpdate?: string | null }>) => Promise<void>;
};

const RECONNECT_BASE_MS = 5_000;
const RECONNECT_MAX_MS = 120_000;

// Conector server-side al WebSocket de Traccar. Corre en el proceso worker,
// nunca en el request path de Next.
export function startWebsocketConnector(handlers: ConnectorHandlers): { stop: () => void } {
  let stopped = false;
  let ws: WebSocket | null = null;
  let attempt = 0;

  async function connect() {
    if (stopped) return;
    try {
      const cookie = await traccarClient.getSessionCookie();
      const wsUrl = process.env.TRACCAR_URL!.replace(/^http/, "ws").replace(/\/$/, "") + "/api/socket";
      ws = new WebSocket(wsUrl, { headers: { Cookie: cookie } });

      ws.on("open", () => {
        attempt = 0;
        console.log("[traccar-ws] conectado");
      });

      ws.on("message", (data) => {
        void (async () => {
          try {
            const payload = JSON.parse(data.toString()) as {
              positions?: TraccarPosition[];
              devices?: Array<{ id: number; status?: string; lastUpdate?: string | null }>;
            };
            if (payload.positions?.length) await handlers.onPositions(payload.positions);
            if (payload.devices?.length && handlers.onDeviceStatus) {
              await handlers.onDeviceStatus(payload.devices);
            }
          } catch (err) {
            console.error("[traccar-ws] error procesando mensaje", err);
          }
        })();
      });

      ws.on("close", scheduleReconnect);
      ws.on("error", (err) => {
        console.error("[traccar-ws] error", err.message);
        ws?.close();
      });
    } catch (err) {
      if (err instanceof TraccarUnavailableError) {
        console.warn(`[traccar-ws] ${err.message}; reintentando`);
      } else {
        console.error("[traccar-ws] error inesperado", err);
      }
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (stopped) return;
    attempt += 1;
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** Math.min(attempt, 6), RECONNECT_MAX_MS);
    setTimeout(connect, delay);
  }

  void connect();

  return {
    stop() {
      stopped = true;
      ws?.close();
    },
  };
}
