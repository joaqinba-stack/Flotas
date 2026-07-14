"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { serviceOrderInputSchema, serviceOrderStatusSchema, noteSchema } from "@/lib/validation/inputs";
import {
  createServiceOrder,
  updateServiceOrderStatus,
  addServiceOrderNote,
} from "@/lib/data/supplier-orders";

export async function createServiceOrderAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/ordenes/nueva", revalidate: ["/ordenes"] }, async () => {
    const input = serviceOrderInputSchema.parse(formDataToObject(formData));
    const order = await createServiceOrder(session, input);
    return `/ordenes/${order.id}`;
  });
}

export async function updateOrderStatusAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.SUPPLIER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = serviceOrderStatusSchema.parse(formDataToObject(formData));
    await updateServiceOrderStatus(session, id, input.toStatus, input.costFinal);
    return backPath;
  });
}

export async function addOrderNoteAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.SUPPLIER);
  return runFormAction({ errorPath: backPath, revalidate: [backPath] }, async () => {
    const input = noteSchema.parse(formDataToObject(formData));
    await addServiceOrderNote(session, id, input.body);
    return backPath;
  });
}
