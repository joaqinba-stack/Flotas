"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { alertAcknowledgeSchema } from "@/lib/validation/inputs";
import { acknowledgeAlert } from "@/lib/data/alerts";

export async function acknowledgeAlertAction(id: string, backPath: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR, Role.DESK_AGENT);
  return runFormAction({ errorPath: backPath, revalidate: [backPath, "/alertas"] }, async () => {
    const input = alertAcknowledgeSchema.parse(formDataToObject(formData));
    await acknowledgeAlert(session, id, input.status);
    return backPath;
  });
}
