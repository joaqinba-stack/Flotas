"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  deskTicketInputSchema,
  deskTicketStatusSchema,
  deskTicketAssignSchema,
  noteSchema,
} from "@/lib/validation/inputs";
import {
  createDeskTicket,
  updateDeskTicketStatus,
  assignDeskTicket,
  addDeskTicketNote,
} from "@/lib/data/desk-tickets";

export async function createDeskTicketAction(formData: FormData) {
  const session = await requireSession(Role.DESK_AGENT);
  return runFormAction({ errorPath: "/desk/nuevo", revalidate: ["/desk"] }, async () => {
    const input = deskTicketInputSchema.parse(formDataToObject(formData));
    const ticket = await createDeskTicket(session, input);
    return `/desk/${ticket.id}`;
  });
}

export async function updateDeskTicketStatusAction(id: string, formData: FormData) {
  const session = await requireSession(Role.DESK_AGENT);
  return runFormAction({ errorPath: `/desk/${id}`, revalidate: ["/desk", `/desk/${id}`] }, async () => {
    const input = deskTicketStatusSchema.parse(formDataToObject(formData));
    await updateDeskTicketStatus(session, id, input.toStatus);
    return `/desk/${id}`;
  });
}

export async function assignDeskTicketAction(id: string, formData: FormData) {
  const session = await requireSession(Role.DESK_AGENT);
  return runFormAction({ errorPath: `/desk/${id}`, revalidate: ["/desk", `/desk/${id}`] }, async () => {
    const input = deskTicketAssignSchema.parse(formDataToObject(formData));
    await assignDeskTicket(session, id, input.assignedToId);
    return `/desk/${id}`;
  });
}

export async function addDeskTicketNoteAction(id: string, formData: FormData) {
  const session = await requireSession(Role.DESK_AGENT);
  return runFormAction({ errorPath: `/desk/${id}`, revalidate: [`/desk/${id}`] }, async () => {
    const input = noteSchema.parse(formDataToObject(formData));
    await addDeskTicketNote(session, id, input.body);
    return `/desk/${id}`;
  });
}
