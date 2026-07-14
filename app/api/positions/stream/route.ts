import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { latestPositions } from "@/lib/data/positions";
import { ApiError } from "@/lib/errors";

const PUSH_INTERVAL_MS = 5_000;

// SSE de últimas posiciones, filtradas por el scope del viewer en lib/data.
export async function GET(req: Request) {
  let session;
  try {
    session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    return new Response(JSON.stringify({ error: "No autorizado" }), { status });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = async () => {
        if (closed) return;
        try {
          const positions = await latestPositions(session);
          const body = JSON.stringify(positions, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
          controller.enqueue(encoder.encode(`data: ${body}\n\n`));
        } catch {
          closed = true;
          clearInterval(timer);
          controller.close();
        }
      };
      const timer = setInterval(send, PUSH_INTERVAL_MS);
      void send();
      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
