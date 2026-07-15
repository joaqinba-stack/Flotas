import { Prisma, Role, AlertStatus, AlertType, AlertSeverity } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

function alertScopeWhere(session: SessionUser): Prisma.AlertWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { vehicle: { currentDriverId: session.driverId } };
  }
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  return { vehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput };
}

export async function listAlerts(
  session: SessionUser,
  filters?: { status?: AlertStatus; type?: AlertType; severity?: AlertSeverity; vehicleId?: string },
) {
  const where: Prisma.AlertWhereInput = { AND: [alertScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.type) where.type = filters.type;
  if (filters?.severity) where.severity = filters.severity;
  if (filters?.vehicleId) where.vehicleId = filters.vehicleId;
  return prisma.alert.findMany({
    where,
    orderBy: { occurredAt: "desc" },
    take: 300,
    include: {
      vehicle: { select: { id: true, plate: true } },
      geofence: { select: { id: true, name: true } },
      acknowledgedBy: { select: { name: true } },
    },
  });
}

export async function getAlert(session: SessionUser, id: string) {
  const alert = await prisma.alert.findFirst({
    where: { id, AND: [alertScopeWhere(session)] },
    include: {
      vehicle: { select: { id: true, plate: true } },
      geofence: { select: { id: true, name: true } },
      acknowledgedBy: { select: { name: true } },
      notifications: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!alert) throw new NotFoundError("Alerta no encontrada");
  return alert;
}

const TRANSITIONS: Record<AlertStatus, AlertStatus[]> = {
  NEW: [AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED],
  ACKNOWLEDGED: [AlertStatus.RESOLVED],
  RESOLVED: [],
};

export async function acknowledgeAlert(session: SessionUser, id: string, toStatus: AlertStatus) {
  if (session.role === Role.DRIVER) throw new ForbiddenError();
  const alert = await getAlert(session, id);
  if (!TRANSITIONS[alert.status].includes(toStatus)) {
    throw new ValidationError(`Transición inválida ${alert.status} → ${toStatus}`);
  }
  return prisma.alert.update({
    where: { id },
    data: {
      status: toStatus,
      acknowledgedById: session.userId,
      acknowledgedAt: new Date(),
    },
  });
}

// --- Funciones de sistema (motor de reglas / jobs, sin sesión de usuario) ---

export async function systemCreateAlert(input: {
  type: AlertType;
  severity: AlertSeverity;
  vehicleId: string;
  geofenceId?: string;
  positionId?: string;
  message: string;
  details?: Record<string, unknown>;
  occurredAt: Date;
}) {
  return prisma.alert.create({
    data: {
      type: input.type,
      severity: input.severity,
      vehicleId: input.vehicleId,
      geofenceId: input.geofenceId,
      positionId: input.positionId,
      message: input.message,
      details: input.details as Prisma.InputJsonValue,
      occurredAt: input.occurredAt,
    },
  });
}

// Evita duplicar la misma alerta si ya existe una NEW/ACKNOWLEDGED equivalente
// reciente (misma unidad+tipo[+geocerca]) dentro de la ventana indicada.
export async function systemHasRecentOpenAlert(
  vehicleId: string,
  type: AlertType,
  windowMinutes: number,
  geofenceId?: string,
) {
  const since = new Date(Date.now() - windowMinutes * 60_000);
  const existing = await prisma.alert.findFirst({
    where: {
      vehicleId,
      type,
      geofenceId: geofenceId ?? null,
      status: { in: [AlertStatus.NEW, AlertStatus.ACKNOWLEDGED] },
      occurredAt: { gte: since },
    },
    select: { id: true },
  });
  return existing !== null;
}

// ADMIN siempre recibe; un SUPERVISOR solo si su unidad es ancestro (o la
// misma) de la unidad del vehículo, es decir si el vehículo cae en su alcance.
export async function systemGetAlert(alertId: string) {
  return prisma.alert.findUnique({ where: { id: alertId } });
}

export async function systemRecipientsForAlert(vehicleId: string): Promise<string[]> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    select: { orgUnit: { select: { path: true } } },
  });
  if (!vehicle) return [];
  const candidates = await prisma.user.findMany({
    where: { active: true, role: { in: [Role.ADMIN, Role.SUPERVISOR] } },
    select: { email: true, role: true, orgUnit: { select: { path: true } } },
  });
  return candidates
    .filter((u) => u.role === Role.ADMIN || (u.orgUnit && vehicle.orgUnit.path.startsWith(u.orgUnit.path)))
    .map((u) => u.email);
}

export async function systemLogNotification(input: {
  alertId: string;
  channel: "EMAIL" | "SMS" | "PUSH";
  recipient: string;
  status: "PENDING" | "SENT" | "FAILED";
  error?: string;
}) {
  return prisma.alertNotificationLog.create({
    data: {
      alertId: input.alertId,
      channel: input.channel,
      recipient: input.recipient,
      status: input.status,
      error: input.error,
      sentAt: input.status === "SENT" ? new Date() : null,
    },
  });
}
