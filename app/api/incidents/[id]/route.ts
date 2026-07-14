import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getIncident, classifyIncident } from "@/lib/data/incidents";
import { incidentClassifySchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  const { id } = await params;
  return json(await getIncident(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = incidentClassifySchema.parse(await req.json());
  return json(await classifyIncident(session, id, input));
});
