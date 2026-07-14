"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  jornadaInputSchema,
  odometerSchema,
  viaticoInputSchema,
  permitInputSchema,
  novedadInputSchema,
} from "@/lib/validation/inputs";
import { createJornada, startJornada, completeJornada, cancelJornada } from "@/lib/data/jornadas";
import { addViatico, resolveViatico, addPermit, resolvePermit, addNovedad } from "@/lib/data/jornada-items";

export async function createJornadaAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/jornadas/nueva", revalidate: ["/jornadas"] }, async () => {
    const input = jornadaInputSchema.parse(formDataToObject(formData));
    const jornada = await createJornada(session, input);
    return `/jornadas/${jornada.id}`;
  });
}

export async function startJornadaAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DRIVER);
  return runFormAction({ errorPath: `/jornadas/${id}`, revalidate: ["/jornadas", `/jornadas/${id}`] }, async () => {
    const input = odometerSchema.parse(formDataToObject(formData));
    await startJornada(session, id, input.odometerKm);
    return `/jornadas/${id}`;
  });
}

export async function completeJornadaAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DRIVER);
  return runFormAction({ errorPath: `/jornadas/${id}`, revalidate: ["/jornadas", `/jornadas/${id}`] }, async () => {
    const input = odometerSchema.parse(formDataToObject(formData));
    await completeJornada(session, id, input.odometerKm);
    return `/jornadas/${id}`;
  });
}

export async function cancelJornadaAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: `/jornadas/${id}`, revalidate: ["/jornadas", `/jornadas/${id}`] }, async () => {
    const reason = (formData.get("reason") as string) || null;
    await cancelJornada(session, id, reason);
    return `/jornadas/${id}`;
  });
}

export async function addViaticoAction(jornadaId: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = viaticoInputSchema.parse(formDataToObject(formData));
    await addViatico(session, jornadaId, input);
    return backPath;
  });
}

export async function resolveViaticoAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const decision = formData.get("decision");
    if (decision !== "APPROVED" && decision !== "REJECTED" && decision !== "PAID") {
      throw new Error("Decisión inválida");
    }
    await resolveViatico(session, id, decision);
    return backPath;
  });
}

export async function addPermitAction(jornadaId: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = permitInputSchema.parse(formDataToObject(formData));
    await addPermit(session, jornadaId, input);
    return backPath;
  });
}

export async function resolvePermitAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const decision = formData.get("decision");
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      throw new Error("Decisión inválida");
    }
    await resolvePermit(session, id, decision);
    return backPath;
  });
}

export async function addNovedadAction(jornadaId: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DRIVER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = novedadInputSchema.parse(formDataToObject(formData));
    await addNovedad(session, jornadaId, input);
    return backPath;
  });
}
