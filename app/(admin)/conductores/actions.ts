"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { driverInputSchema, driverLoginSchema, performanceRecordSchema } from "@/lib/validation/inputs";
import { createDriver, updateDriver } from "@/lib/data/drivers";
import { addPerformanceRecord } from "@/lib/data/performance-records";

export async function createDriverAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/conductores/nuevo", revalidate: ["/conductores"] }, async () => {
    const raw = formDataToObject(formData);
    const input = driverInputSchema.parse(raw);
    const login = raw.loginEmail
      ? driverLoginSchema.parse({ email: raw.loginEmail, password: raw.loginPassword })
      : undefined;
    const driver = await createDriver(session, input, login);
    return `/conductores/${driver.id}`;
  });
}

export async function addPerformanceRecordAction(driverId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/conductores/${driverId}`, revalidate: [`/conductores/${driverId}`] },
    async () => {
      const input = performanceRecordSchema.parse(formDataToObject(formData));
      await addPerformanceRecord(session, driverId, input);
      return `/conductores/${driverId}`;
    },
  );
}

export async function updateDriverAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/conductores/${id}/editar`, revalidate: ["/conductores", `/conductores/${id}`] },
    async () => {
      const input = driverInputSchema.parse(formDataToObject(formData));
      await updateDriver(session, id, input);
      return `/conductores/${id}`;
    },
  );
}
