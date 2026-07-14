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
  try {
    const remote = await traccarClient.createDevice({ name: input.name, uniqueId: input.uniqueId });
    traccarId = remote.id;
  } catch (err) {
    if (!(err instanceof TraccarUnavailableError)) throw err;
    console.warn(`[traccar] no disponible al provisionar ${input.uniqueId}; queda pendiente de sync`);
  }

  return prisma.traccarDevice.create({
    data: {
      vehicleId,
      traccarId,
      uniqueId: input.uniqueId,
      name: input.name,
      monitoringIntervalSeconds: input.monitoringIntervalSeconds,
    },
  });
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

  if (device.traccarId !== null) {
    try {
      await traccarClient.updateDevice(device.traccarId, { name: input.name, uniqueId: device.uniqueId });
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
    }
  }
  return prisma.traccarDevice.update({ where: { id: deviceId }, data: input });
}

export async function removeDevice(session: SessionUser, deviceId: string) {
  requireManager(session);
  const device = await prisma.traccarDevice.findUnique({ where: { id: deviceId } });
  if (!device) throw new NotFoundError("Dispositivo no encontrado");
  await getVehicle(session, device.vehicleId);

  if (device.traccarId !== null) {
    try {
      await traccarClient.deleteDevice(device.traccarId);
    } catch (err) {
      if (!(err instanceof TraccarUnavailableError)) throw err;
    }
  }
  return prisma.traccarDevice.delete({ where: { id: deviceId } });
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
