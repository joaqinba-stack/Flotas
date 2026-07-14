import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, IncidentStatus, IncidentUrgency } from "@/lib/data/types";
import { listIncidents, createIncident } from "@/lib/data/incidents";
import { incidentInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const urgency = url.searchParams.get("urgency");
  return json(
    await listIncidents(session, {
      status: status && status in IncidentStatus ? (status as IncidentStatus) : undefined,
      urgency: urgency && urgency in IncidentUrgency ? (urgency as IncidentUrgency) : undefined,
      vehicleId: url.searchParams.get("vehicleId") ?? undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const input = incidentInputSchema.parse(await req.json());
  return json(await createIncident(session, input), { status: 201 });
});
