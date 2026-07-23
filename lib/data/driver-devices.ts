import { Role, DeviceConnectionStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getDriver } from "./drivers";
import { traccarClient, TraccarUnavailableError } from "@/lib/traccar/client";

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export async function provisionDriverDevice(
  session: SessionUser,
  driverId: string,
  input: { uniqueId: string; name: string; monitoringIntervalSeconds: number },
) {
  requireManager(session);
  const driver = await getDriver(session, driverId);
  if (driver.device) throw new ValidationError("El conductor ya tiene un dispositivo asignado");

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

  const device = await prisma.driverDevice.create({
    data: {
      driverId,
      traccarId,
      uniqueId: input.uniqueId,
      name: input.name,
      monitoringIntervalSeconds: input.monitoringIntervalSeconds,
    },
  });
  return { device, syncWarning };
}

export async function updateDriverDevice(
  session: SessionUser,
  deviceId: string,
  input: { name: string; monitoringIntervalSeconds: number },
) {
  requireManager(session);
  const device = await prisma.driverDevice.findUnique({ where: { id: deviceId }, include: { driver: true } });
  if (!device) throw new NotFoundError("Dispositivo no encontrado");
  await getDriver(session, device.driverId);

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

  const updated = await prisma.driverDevice.update({ where: { id: deviceId }, data: input });
  return { device: updated, syncWarning };
}

export async function removeDriverDevice(session: SessionUser, deviceId: string) {
  requireManager(session);
  const device = await prisma.driverDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new NotFoundError("Dispositivo no encontrado");
  await getDriver(session, device.driverId);

  let syncWarning: string | null = null;
  if (device.traccarId !== null) {
    try {
      await traccarClient.deleteDevice(device.traccarId);
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
      console.warn(`[traccar] no disponible al eliminar ${device.uniqueId} (id ${device.traccarId})`);
      // Se borra igual del lado local, así que el conductor queda huérfano en
      // Traccar: hay que avisarlo o nadie se entera de que quedó colgado.
      syncWarning =
        `El dispositivo se quitó del conductor, pero no se pudo eliminar en Traccar (${err.message}). ` +
        `Quedó huérfano allá con identificador ${device.uniqueId} (id ${device.traccarId}): borralo a mano.`;
    }
  }

  const removed = await prisma.driverDevice.delete({ where: { id: deviceId } });
  return { device: removed, syncWarning };
}

// --- Funciones de sistema (jobs/webhook, sin sesión de usuario) ---

export async function systemListDriverDevices() {
  return prisma.driverDevice.findMany({ include: { driver: { select: { id: true, firstName: true, lastName: true } } } });
}

export async function systemFindDriverByTraccarId(traccarId: number) {
  return prisma.driverDevice.findUnique({ where: { traccarId } });
}

export async function systemSyncPendingDriverDevices() {
  const pending = await prisma.driverDevice.findMany({ where: { traccarId: null } });
  for (const device of pending) {
    try {
      const remote = await traccarClient.createDevice({ name: device.name, uniqueId: device.uniqueId });
      await prisma.driverDevice.update({ where: { id: device.id }, data: { traccarId: remote.id } });
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
      return;
    }
  }
}

export async function systemSetDriverConnectionStatus(
  traccarId: number,
  status: DeviceConnectionStatus,
  lastSeenAt?: Date,
) {
  const device = await prisma.driverDevice.findUnique({ where: { traccarId } });
  if (!device) return null;
  return prisma.driverDevice.update({
    where: { id: device.id },
    data: { connectionStatus: status, ...(lastSeenAt ? { lastSeenAt } : {}) },
  });
}
