import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, DriverStatus } from "@/lib/data/types";
import { listDrivers, createDriver } from "@/lib/data/drivers";
import { driverInputSchema, driverLoginSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  return json(
    await listDrivers(session, {
      q: url.searchParams.get("q") ?? undefined,
      status: status && status in DriverStatus ? (status as DriverStatus) : undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const body = await req.json();
  const input = driverInputSchema.parse(body);
  const login = body.loginEmail ? driverLoginSchema.parse({ email: body.loginEmail, password: body.loginPassword }) : undefined;
  return json(await createDriver(session, input, login), { status: 201 });
});
