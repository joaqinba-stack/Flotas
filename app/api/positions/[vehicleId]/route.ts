import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getVehiclePositions } from "@/lib/data/positions";

type Ctx = { params: Promise<{ vehicleId: string }> };

export const GET = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const { vehicleId } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const limit = url.searchParams.get("limit");
  const positions = await getVehiclePositions(session, vehicleId, {
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
    limit: limit ? Math.min(Number(limit), 2000) : undefined,
  });
  return json(positions);
});
