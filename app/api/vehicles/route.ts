import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, VehicleStatus } from "@/lib/data/types";
import { listVehicles, createVehicle } from "@/lib/data/vehicles";
import { vehicleInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const vehicles = await listVehicles(session, {
    status: status && status in VehicleStatus ? (status as VehicleStatus) : undefined,
    q: url.searchParams.get("q") ?? undefined,
    orgUnitId: url.searchParams.get("orgUnitId") ?? undefined,
  });
  return json(vehicles);
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = vehicleInputSchema.parse(await req.json());
  const vehicle = await createVehicle(session, input);
  return json(vehicle, { status: 201 });
});
