"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { tireInputSchema, tireMovementSchema } from "@/lib/validation/inputs";
import { createTire, registerTireMovement } from "@/lib/data/tires";

export async function createTireAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/neumaticos/nuevo", revalidate: ["/neumaticos"] }, async () => {
    const input = tireInputSchema.parse(formDataToObject(formData));
    const tire = await createTire(session, input);
    return `/neumaticos/${tire.id}`;
  });
}

export async function registerTireMovementAction(tireId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/neumaticos/${tireId}`, revalidate: ["/neumaticos", `/neumaticos/${tireId}`] },
    async () => {
      const input = tireMovementSchema.parse(formDataToObject(formData));
      await registerTireMovement(session, tireId, input);
      return `/neumaticos/${tireId}`;
    },
  );
}
