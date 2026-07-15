import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listReportDefinitions, createReportDefinition } from "@/lib/data/reports";
import { reportDefinitionInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async () => {
  const session = await requireApiSession(Role.SUPERVISOR);
  return json(await listReportDefinitions(session));
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const input = reportDefinitionInputSchema.parse(await req.json());
  return json(await createReportDefinition(session, input), { status: 201 });
});
