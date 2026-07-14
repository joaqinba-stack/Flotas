import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, JornadaStatus } from "@/lib/data/types";
import { listJornadas, createJornada } from "@/lib/data/jornadas";
import { jornadaInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  return json(
    await listJornadas(session, {
      status: status && status in JornadaStatus ? (status as JornadaStatus) : undefined,
      vehicleId: url.searchParams.get("vehicleId") ?? undefined,
      driverId: url.searchParams.get("driverId") ?? undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = jornadaInputSchema.parse(await req.json());
  return json(await createJornada(session, input), { status: 201 });
});
