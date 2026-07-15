import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDeskTicket, updateDeskTicketStatus } from "@/lib/data/desk-tickets";
import { deskTicketStatusSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const GET = apiHandler<Ctx>(async (_req, { params }) => {
  const session = await requireApiSession(Role.ADMIN, Role.DESK_AGENT, Role.SUPERVISOR);
  const { id } = await params;
  return json(await getDeskTicket(session, id));
});

export const PATCH = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.ADMIN, Role.DESK_AGENT);
  const { id } = await params;
  const input = deskTicketStatusSchema.parse(await req.json());
  return json(await updateDeskTicketStatus(session, id, input.toStatus));
});
