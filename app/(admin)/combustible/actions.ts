"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { fuelLoadInputSchema, fuelReviewSchema } from "@/lib/validation/inputs";
import { createFuelLoad, reviewFuelLoad } from "@/lib/data/fuel-loads";

export async function createFuelLoadAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/combustible/nueva", revalidate: ["/combustible"] }, async () => {
    const input = fuelLoadInputSchema.parse(formDataToObject(formData));
    await createFuelLoad(session, input);
    return "/combustible";
  });
}

export async function reviewFuelLoadAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/combustible", revalidate: ["/combustible"] }, async () => {
    const input = fuelReviewSchema.parse(formDataToObject(formData));
    await reviewFuelLoad(session, id, input.decision, input.note);
    return "/combustible";
  });
}
