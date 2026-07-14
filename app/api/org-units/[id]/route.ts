import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getOrgUnit, updateOrgUnit, deleteOrgUnit } from "@/lib/data/org-units";
import { orgUnitInputSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  const { id } = await params;
  return json(await getOrgUnit(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession();
  const { id } = await params;
  const input = orgUnitInputSchema.parse(await req.json());
  return json(await updateOrgUnit(session, id, input));
});

export const DELETE = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession();
  const { id } = await params;
  await deleteOrgUnit(session, id);
  return json({ ok: true });
});
