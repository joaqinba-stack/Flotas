import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, TireStatus } from "@/lib/data/types";
import { listTires, createTire } from "@/lib/data/tires";
import { tireInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  return json(
    await listTires(session, {
      status: status && status in TireStatus ? (status as TireStatus) : undefined,
      q: url.searchParams.get("q") ?? undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = tireInputSchema.parse(await req.json());
  return json(await createTire(session, input), { status: 201 });
});
