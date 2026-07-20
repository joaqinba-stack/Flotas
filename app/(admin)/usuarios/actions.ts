"use server";

import { headers } from "next/headers";
import { requireSession } from "@/lib/auth/session";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  userCreateSchema,
  userUpdateSchema,
  setPasswordSchema,
} from "@/lib/validation/inputs";
import { createUser, updateUser, setUserPassword } from "@/lib/data/users";
import { adminCreateResetLink } from "@/lib/data/password-reset";

async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function createUserAction(formData: FormData) {
  const session = await requireSession();
  return runFormAction({ errorPath: "/usuarios/nuevo", revalidate: ["/usuarios"] }, async () => {
    const input = userCreateSchema.parse(formDataToObject(formData));
    const user = await createUser(session, input);
    return `/usuarios/${user.id}`;
  });
}

export async function updateUserAction(id: string, formData: FormData) {
  const session = await requireSession();
  return runFormAction(
    { errorPath: `/usuarios/${id}`, revalidate: ["/usuarios", `/usuarios/${id}`] },
    async () => {
      const input = userUpdateSchema.parse(formDataToObject(formData));
      await updateUser(session, id, input);
      return `/usuarios/${id}?ok=${encodeURIComponent("Datos guardados")}`;
    },
  );
}

export async function setUserPasswordAction(id: string, formData: FormData) {
  const session = await requireSession();
  return runFormAction({ errorPath: `/usuarios/${id}` }, async () => {
    const input = setPasswordSchema.parse(formDataToObject(formData));
    await setUserPassword(session, id, input.password);
    return `/usuarios/${id}?ok=${encodeURIComponent("Contraseña actualizada")}`;
  });
}

export async function generateResetLinkAction(id: string) {
  const session = await requireSession();
  const origin = await requestOrigin();
  return runFormAction({ errorPath: `/usuarios/${id}` }, async () => {
    const url = await adminCreateResetLink(session, id, origin);
    return `/usuarios/${id}?resetUrl=${encodeURIComponent(url)}`;
  });
}
