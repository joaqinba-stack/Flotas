import { Prisma, Role, ServiceOrderStatus, IncidentStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getVehicle } from "./vehicles";
import { getIncident } from "./incidents";
import { getSupplier } from "./suppliers";

function orderScopeWhere(session: SessionUser): Prisma.SupplierServiceOrderWhereInput {
  if (session.role === Role.SUPPLIER) {
    if (!session.supplierId) throw new ForbiddenError();
    return { supplierId: session.supplierId };
  }
  if (session.role === Role.DRIVER) throw new ForbiddenError();
  return { vehicle: buildOrgScopeWhere(session) as Prisma.VehicleWhereInput };
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type ServiceOrderInput = {
  supplierId: string;
  vehicleId: string;
  incidentId: string | null;
  title: string;
  description: string;
  costEstimate: number | null;
  scheduledFor: Date | null;
};

export async function listServiceOrders(
  session: SessionUser,
  filters?: { status?: ServiceOrderStatus; supplierId?: string },
) {
  const where: Prisma.SupplierServiceOrderWhereInput = { AND: [orderScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.supplierId) where.supplierId = filters.supplierId;
  return prisma.supplierServiceOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 300,
    include: {
      supplier: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true } },
      incident: { select: { id: true, code: true, title: true } },
    },
  });
}

export async function getServiceOrder(session: SessionUser, id: string) {
  const order = await prisma.supplierServiceOrder.findFirst({
    where: { id, AND: [orderScopeWhere(session)] },
    include: {
      supplier: { select: { id: true, name: true } },
      vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      // Visibilidad derivada para el proveedor: solo el resumen del incidente
      // vinculado a SU orden, nunca el listado general.
      incident: { select: { id: true, code: true, title: true, description: true, urgency: true, status: true } },
      createdBy: { select: { name: true } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!order) throw new NotFoundError("Orden de servicio no encontrada");
  return order;
}

export async function createServiceOrder(session: SessionUser, input: ServiceOrderInput) {
  requireManager(session);
  await getVehicle(session, input.vehicleId);
  await getSupplier(session, input.supplierId);
  if (input.incidentId) {
    const incident = await getIncident(session, input.incidentId);
    if (incident.vehicle.id !== input.vehicleId) {
      throw new ValidationError("La incidencia no corresponde al vehículo");
    }
  }
  return prisma.$transaction(async (tx) => {
    const order = await tx.supplierServiceOrder.create({
      data: {
        supplierId: input.supplierId,
        vehicleId: input.vehicleId,
        incidentId: input.incidentId,
        title: input.title,
        description: input.description,
        costEstimate: input.costEstimate,
        scheduledFor: input.scheduledFor,
        createdById: session.userId,
      },
    });
    if (input.incidentId) {
      await tx.incident.update({
        where: { id: input.incidentId },
        data: { status: IncidentStatus.WAITING_SUPPLIER },
      });
    }
    return order;
  });
}

// Transiciones del proveedor sobre SUS órdenes; ADMIN/SUPERVISOR también puede
// operar (p. ej. cancelar) dentro de su alcance.
const TRANSITIONS: Record<ServiceOrderStatus, ServiceOrderStatus[]> = {
  SENT: [ServiceOrderStatus.ACCEPTED, ServiceOrderStatus.CANCELLED],
  ACCEPTED: [ServiceOrderStatus.IN_PROGRESS, ServiceOrderStatus.CANCELLED],
  IN_PROGRESS: [ServiceOrderStatus.COMPLETED, ServiceOrderStatus.CANCELLED],
  COMPLETED: [],
  CANCELLED: [],
};

export async function updateServiceOrderStatus(
  session: SessionUser,
  id: string,
  toStatus: ServiceOrderStatus,
  costFinal: number | null,
) {
  const order = await getServiceOrder(session, id);
  if (session.role === Role.DESK_AGENT) throw new ForbiddenError();
  if (toStatus === ServiceOrderStatus.CANCELLED && session.role === Role.SUPPLIER) {
    throw new ForbiddenError("Solo la administración cancela órdenes");
  }
  if (!TRANSITIONS[order.status].includes(toStatus)) {
    throw new ValidationError(`Transición inválida ${order.status} → ${toStatus}`);
  }
  return prisma.supplierServiceOrder.update({
    where: { id },
    data: {
      status: toStatus,
      costFinal: toStatus === ServiceOrderStatus.COMPLETED ? costFinal : undefined,
      completedAt: toStatus === ServiceOrderStatus.COMPLETED ? new Date() : undefined,
    },
  });
}

export async function addServiceOrderNote(session: SessionUser, orderId: string, body: string) {
  if (session.role === Role.DRIVER || session.role === Role.DESK_AGENT) throw new ForbiddenError();
  await getServiceOrder(session, orderId);
  return prisma.supplierServiceOrderNote.create({
    data: { orderId, authorId: session.userId, body },
  });
}
