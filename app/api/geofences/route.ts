import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listGeofences, createGeofence } from "@/lib/data/geofences";
import { geofenceInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async () => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  return json(await listGeofences(session));
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = geofenceInputSchema.parse(await req.json());
  return json(await createGeofence(session, input), { status: 201 });
});
