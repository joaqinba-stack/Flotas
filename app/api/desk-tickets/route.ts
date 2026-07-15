import { apiHandler, json } from "@/lib/api";
import { requireApiSession } from "@/lib/auth/session";
import { Role, DeskTicketStatus, DeskChannel } from "@/lib/data/types";
import { listDeskTickets, createDeskTicket } from "@/lib/data/desk-tickets";
import { deskTicketInputSchema } from "@/lib/validation/inputs";

export const GET = apiHandler(async (req) => {
  const session = await requireApiSession(Role.ADMIN, Role.DESK_AGENT, Role.SUPERVISOR);
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const channel = url.searchParams.get("channel");
  return json(
    await listDeskTickets(session, {
      status: status && status in DeskTicketStatus ? (status as DeskTicketStatus) : undefined,
      channel: channel && channel in DeskChannel ? (channel as DeskChannel) : undefined,
    }),
  );
});

export const POST = apiHandler(async (req) => {
  const session = await requireApiSession(Role.ADMIN, Role.DESK_AGENT);
  const input = deskTicketInputSchema.parse(await req.json());
  return json(await createDeskTicket(session, input), { status: 201 });
});
