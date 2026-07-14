import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { changeVehicleStatus } from "@/lib/data/vehicles";
import { vehicleStatusChangeSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = vehicleStatusChangeSchema.parse(await req.json());
  const [vehicle] = await changeVehicleStatus(session, id, input.toStatus, input.reason);
  return json(vehicle);
});
