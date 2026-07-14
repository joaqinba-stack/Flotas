"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { orgUnitInputSchema } from "@/lib/validation/inputs";
import { createOrgUnit, updateOrgUnit, deleteOrgUnit } from "@/lib/data/org-units";

export async function createOrgUnitAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/organigrama", revalidate: ["/organigrama"] }, async () => {
    const input = orgUnitInputSchema.parse(formDataToObject(formData));
    await createOrgUnit(session, input);
    return "/organigrama";
  });
}

export async function updateOrgUnitAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/organigrama/${id}/editar`, revalidate: ["/organigrama"] },
    async () => {
      const input = orgUnitInputSchema.parse(formDataToObject(formData));
      await updateOrgUnit(session, id, input);
      return "/organigrama";
    },
  );
}

export async function deleteOrgUnitAction(id: string) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/organigrama", revalidate: ["/organigrama"] }, async () => {
    await deleteOrgUnit(session, id);
    return "/organigrama";
  });
}
