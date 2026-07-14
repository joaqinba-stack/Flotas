import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits, createOrgUnit } from "@/lib/data/org-units";
import { orgUnitInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async () => {
  const session = await requireApiSession(Role.SUPERVISOR, Role.DESK_AGENT);
  return json(await listOrgUnits(session));
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession();
  const input = orgUnitInputSchema.parse(await req.json());
  return json(await createOrgUnit(session, input), { status: 201 });
});
