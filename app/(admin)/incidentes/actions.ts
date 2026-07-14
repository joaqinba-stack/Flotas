"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  incidentInputSchema,
  incidentClassifySchema,
  noteSchema,
  serviceOrderInputSchema,
} from "@/lib/validation/inputs";
import {
  createIncident,
  classifyIncident,
  addIncidentNote,
  addIncidentAttachment,
} from "@/lib/data/incidents";
import { createServiceOrder } from "@/lib/data/supplier-orders";

export async function createIncidentAction(backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: ["/incidentes"] }, async () => {
    const input = incidentInputSchema.parse(formDataToObject(formData));
    const incident = await createIncident(session, input);
    return session.role === Role.DRIVER || session.role === Role.DESK_AGENT
      ? backPath
      : `/incidentes/${incident.id}`;
  });
}

export async function classifyIncidentAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/incidentes/${id}`, revalidate: ["/incidentes", `/incidentes/${id}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = incidentClassifySchema.parse({
        urgency: raw.urgency || undefined,
        category: raw.category || undefined,
        status: raw.status || undefined,
      });
      await classifyIncident(session, id, input);
      return `/incidentes/${id}`;
    },
  );
}

export async function addIncidentNoteAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = noteSchema.parse(formDataToObject(formData));
    await addIncidentNote(session, id, input.body);
    return backPath;
  });
}

export async function addIncidentAttachmentAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const file = formData.get("file");
    if (!(file instanceof File)) throw new Error("Archivo requerido");
    await addIncidentAttachment(session, id, file);
    return backPath;
  });
}

export async function dispatchServiceOrderAction(incidentId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/incidentes/${incidentId}`, revalidate: [`/incidentes/${incidentId}`, "/ordenes"] },
    async () => {
      const input = serviceOrderInputSchema.parse({
        ...formDataToObject(formData),
        incidentId,
      });
      const order = await createServiceOrder(session, input);
      return `/ordenes/${order.id}`;
    },
  );
}
