import { Role, DeviceConnectionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";
import { traccarClient, TraccarUnavailableError } from "@/lib/traccar/client";

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export async function provisionDevice(
  session: SessionUser,
  vehicleId: string,
  input: { uniqueId: string; name: string; monitoringIntervalSeconds: number },
) {
  requireManager(session);
  const vehicle = await getVehicle(session, vehicleId);
  if (vehicle.traccarDevice) throw new ValidationError("El vehículo ya tiene un dispositivo asignado");

  // Alta en el servidor Traccar; si no está alcanzable, se registra localmente
  // con traccarId null y el job de reconciliación lo completa después.
  let traccarId: number | null = null;
  let syncWarning: string | null = null;
  try {
    const remote = await traccarClient.createDevice({ name: input.name, uniqueId: input.uniqueId });
    traccarId = remote.id;
  } catch (err) {
    if (!(err instanceof TraccarUnavailableError)) throw err;
    console.warn(`[traccar] no disponible al provisionar ${input.uniqueId}; queda pendiente de sync`);
    syncWarning =
      `El dispositivo se guardó, pero no se pudo dar de alta en Traccar (${err.message}). ` +
      "Queda pendiente de sincronizar: no recibirá posiciones hasta que el worker lo reintente.";
  }

  const device = await prisma.traccarDevice.create({
    data: {
      vehicleId,
      traccarId,
      uniqueId: input.uniqueId,
      name: input.name,
      monitoringIntervalSeconds: input.monitoringIntervalSeconds,
    },
  });
  return { device, syncWarning };
}

export async function updateDevice(
  session: SessionUser,
  deviceId: string,
  input: { name: string; monitoringIntervalSeconds: number },
) {
  requireManager(session);
  const device = await prisma.traccarDevice.findUnique({ where: { id: deviceId }, include: { vehicle: true } });
  if (!device) throw new NotFoundError("Dispositivo no encontrado");
  await getVehicle(session, device.vehicleId);

  let syncWarning: string | null = null;
  if (device.traccarId === null) {
    syncWarning =
      "El cambio se guardó local. El dispositivo todavía no existe en Traccar: " +
      "se creará con estos datos cuando el worker logre sincronizarlo.";
  } else {
    try {
      await traccarClient.updateDevice(device.traccarId, { name: input.name, uniqueId: device.uniqueId });
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
      console.warn(`[traccar] no disponible al actualizar ${device.uniqueId}`);
      syncWarning =
        `El cambio se guardó local, pero no se pudo replicar en Traccar (${err.message}). ` +
        "Los datos quedan distintos entre ambos sistemas hasta que se reintente.";
    }
  }

  const updated = await prisma.traccarDevice.update({ where: { id: deviceId }, data: input });
  return { device: updated, syncWarning };
}

export async function removeDevice(session: SessionUser, deviceId: string) {
  requireManager(session);
  const device = await prisma.traccarDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new NotFoundError("Dispositivo no encontrado");
  await getVehicle(session, device.vehicleId);

  let syncWarning: string | null = null;
  if (device.traccarId !== null) {
    try {
      await traccarClient.deleteDevice(device.traccarId);
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
      console.warn(`[traccar] no disponible al eliminar ${device.uniqueId} (id ${device.traccarId})`);
      // Se borra igual del lado local, así que el equipo queda huérfano en
      // Traccar: hay que avisarlo o nadie se entera de que quedó colgado.
      syncWarning =
        `El dispositivo se quitó del vehículo, pero no se pudo eliminar en Traccar (${err.message}). ` +
        `Quedó huérfano allá con IMEI ${device.uniqueId} (id ${device.traccarId}): borralo a mano.`;
    }
  }

  const removed = await prisma.traccarDevice.delete({ where: { id: deviceId } });
  return { device: removed, syncWarning };
}

// --- Funciones de sistema (jobs/webhook, sin sesión de usuario) ---

export async function systemListDevices() {
  return prisma.traccarDevice.findMany({ include: { vehicle: { select: { id: true, plate: true } } } });
}

export async function systemFindByTraccarId(traccarId: number) {
  return prisma.traccarDevice.findUnique({ where: { traccarId } });
}

export async function systemSyncPendingDevices() {
  const pending = await prisma.traccarDevice.findMany({ where: { traccarId: null } });
  for (const device of pending) {
    try {
      const remote = await traccarClient.createDevice({ name: device.name, uniqueId: device.uniqueId });
      await prisma.traccarDevice.update({ where: { id: device.id }, data: { traccarId: remote.id } });
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
      return;
    }
  }
}

export async function systemSetConnectionStatus(
  traccarId: number,
  status: DeviceConnectionStatus,
  lastSeenAt?: Date,
) {
  const device = await prisma.traccarDevice.findUnique({ where: { traccarId } });
  if (!device) return null;
  return prisma.traccarDevice.update({
    where: { id: device.id },
    data: { connectionStatus: status, ...(lastSeenAt ? { lastSeenAt } : {}) },
  });
}
