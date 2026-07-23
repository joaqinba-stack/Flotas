"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  driverInputSchema,
  driverLoginSchema,
  performanceRecordSchema,
  deviceInputSchema,
} from "@/lib/validation/inputs";
import { createDriver, updateDriver } from "@/lib/data/drivers";
import { addPerformanceRecord } from "@/lib/data/performance-records";
import { provisionDriverDevice, updateDriverDevice, removeDriverDevice } from "@/lib/data/driver-devices";

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

export async function provisionDriverDeviceAction(driverId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/conductores/${driverId}`, revalidate: [`/conductores/${driverId}`] },
    async () => {
      const input = deviceInputSchema.parse(formDataToObject(formData));
      const { syncWarning } = await provisionDriverDevice(session, driverId, input);
      return { path: `/conductores/${driverId}`, warning: syncWarning };
    },
  );
}

export async function updateDriverDeviceAction(driverId: string, deviceId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/conductores/${driverId}`, revalidate: [`/conductores/${driverId}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = deviceInputSchema.omit({ uniqueId: true }).parse(raw);
      const { syncWarning } = await updateDriverDevice(session, deviceId, input);
      return { path: `/conductores/${driverId}`, warning: syncWarning };
    },
  );
}

export async function removeDriverDeviceAction(driverId: string, deviceId: string) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/conductores/${driverId}`, revalidate: [`/conductores/${driverId}`] },
    async () => {
      const { syncWarning } = await removeDriverDevice(session, deviceId);
      return { path: `/conductores/${driverId}`, warning: syncWarning };
    },
  );
}
