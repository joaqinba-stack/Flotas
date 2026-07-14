import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getVehicle, updateVehicle } from "@/lib/data/vehicles";
import { vehicleInputSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const { id } = await params;
  return json(await getVehicle(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = vehicleInputSchema.parse(await req.json());
  return json(await updateVehicle(session, id, input));
});
