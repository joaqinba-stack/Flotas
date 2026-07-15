import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { assignDeskTicket } from "@/lib/data/desk-tickets";
import { deskTicketAssignSchema } from "@/lib/validation/inputs";

type Ctx = { params: Promise<{ id: string }> };

export const POST = apiHandler<Ctx>(async (req, { params }) => {
  const session = await requireApiSession(Role.ADMIN, Role.DESK_AGENT);
  const { id } = await params;
  const input = deskTicketAssignSchema.parse(await req.json());
  return json(await assignDeskTicket(session, id, input.assignedToId));
});
