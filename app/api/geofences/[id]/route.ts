import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getGeofence, updateGeofence } from "@/lib/data/geofences";
import { geofenceInputSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const { id } = await params;
  return json(await getGeofence(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = geofenceInputSchema.parse(await req.json());
  return json(await updateGeofence(session, id, input));
});
