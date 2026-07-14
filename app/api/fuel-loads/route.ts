import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, FuelValidationStatus } from "@/lib/data/types";
import { listFuelLoads, createFuelLoad } from "@/lib/data/fuel-loads";
import { fuelLoadInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const url = new URL(req.url);
  const vs = url.searchParams.get("validationStatus");
  return json(
    await listFuelLoads(session, {
      vehicleId: url.searchParams.get("vehicleId") ?? undefined,
      validationStatus: vs && vs in FuelValidationStatus ? (vs as FuelValidationStatus) : undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DRIVER);
  const input = fuelLoadInputSchema.parse(await req.json());
  return json(await createFuelLoad(session, input), { status: 201 });
});
