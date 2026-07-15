import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listReportRuns, queueReportRun } from "@/lib/data/reports";
import { reportRunInputSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  return json(await listReportRuns(session, id));
});

export const POST = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.SUPERVISOR);
  const { id } = await params;
  const input = reportRunInputSchema.parse(await req.json());
  return json(await queueReportRun(session, id, input.format, input.filterOverrides), { status: 201 });
});
