"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { geofenceInputSchema } from "@/lib/validation/inputs";
import { createGeofence, updateGeofence } from "@/lib/data/geofences";

export async function createGeofenceAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/geocercas/nueva", revalidate: ["/geocercas"] }, async () => {
    const raw = formDataToObject(formData);
    const input = geofenceInputSchema.parse({ ...raw, active: raw.active ?? "true" });
    const geofence = await createGeofence(session, input);
    return `/geocercas/${geofence.id}`;
  });
}

export async function updateGeofenceAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/geocercas/${id}`, revalidate: ["/geocercas", `/geocercas/${id}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = geofenceInputSchema.parse({ ...raw, active: raw.active ?? "false" });
      await updateGeofence(session, id, input);
      return `/geocercas/${id}`;
    },
  );
}
