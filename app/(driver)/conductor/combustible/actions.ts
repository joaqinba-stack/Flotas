"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { fuelLoadInputSchema } from "@/lib/validation/inputs";
import { createFuelLoad } from "@/lib/data/fuel-loads";

export async function createOwnFuelLoadAction(formData: FormData) {
  const session = await requireSession(Role.DRIVER);
  return runFormAction(
    { errorPath: "/conductor/combustible", revalidate: ["/conductor/combustible"] },
    async () => {
      const input = fuelLoadInputSchema.parse(formDataToObject(formData));
      await createFuelLoad(session, input);
      return "/conductor/combustible";
    },
  );
}
