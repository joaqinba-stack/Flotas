"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import {
  vehicleInputSchema,
  vehicleStatusChangeSchema,
  assignDriverSchema,
  deviceInputSchema,
} from "@/lib/validation/inputs";
import {
  createVehicle,
  updateVehicle,
  changeVehicleStatus,
  assignDriver,
} from "@/lib/data/vehicles";
import { provisionDevice, updateDevice, removeDevice } from "@/lib/data/traccar-devices";

export async function createVehicleAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/flota/nuevo", revalidate: ["/flota"] }, async () => {
    const input = vehicleInputSchema.parse(formDataToObject(formData));
    const vehicle = await createVehicle(session, input);
    return `/flota/${vehicle.id}`;
  });
}

export async function updateVehicleAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${id}/editar`, revalidate: ["/flota", `/flota/${id}`] },
    async () => {
      const input = vehicleInputSchema.parse(formDataToObject(formData));
      await updateVehicle(session, id, input);
      return `/flota/${id}`;
    },
  );
}

export async function changeVehicleStatusAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${id}`, revalidate: ["/flota", `/flota/${id}`] },
    async () => {
      const input = vehicleStatusChangeSchema.parse(formDataToObject(formData));
      await changeVehicleStatus(session, id, input.toStatus, input.reason);
      return `/flota/${id}`;
    },
  );
}

export async function assignDriverAction(id: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${id}`, revalidate: ["/flota", `/flota/${id}`] },
    async () => {
      const input = assignDriverSchema.parse(formDataToObject(formData));
      await assignDriver(session, id, input.driverId);
      return `/flota/${id}`;
    },
  );
}

export async function provisionDeviceAction(vehicleId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${vehicleId}`, revalidate: [`/flota/${vehicleId}`] },
    async () => {
      const input = deviceInputSchema.parse(formDataToObject(formData));
      const { syncWarning } = await provisionDevice(session, vehicleId, input);
      return { path: `/flota/${vehicleId}`, warning: syncWarning };
    },
  );
}

export async function updateDeviceAction(vehicleId: string, deviceId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${vehicleId}`, revalidate: [`/flota/${vehicleId}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = deviceInputSchema.omit({ uniqueId: true }).parse(raw);
      const { syncWarning } = await updateDevice(session, deviceId, input);
      return { path: `/flota/${vehicleId}`, warning: syncWarning };
    },
  );
}

export async function removeDeviceAction(vehicleId: string, deviceId: string) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/flota/${vehicleId}`, revalidate: [`/flota/${vehicleId}`] },
    async () => {
      const { syncWarning } = await removeDevice(session, deviceId);
      return { path: `/flota/${vehicleId}`, warning: syncWarning };
    },
  );
}
