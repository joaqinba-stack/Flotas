import { Prisma, Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

// El catálogo de proveedores es institucional (no depende del organigrama):
// visible para ADMIN/SUPERVISOR/DESK_AGENT; mutable solo por ADMIN/SUPERVISOR.
function requireViewer(session: SessionUser) {
  if (session.role === Role.DRIVER || session.role === Role.SUPPLIER) {
    throw new ForbiddenError();
  }
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type SupplierInput = {
  name: string;
  taxId: string;
  serviceTypes: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  active: boolean;
};

export async function listSuppliers(session: SessionUser, filters?: { q?: string }) {
  requireViewer(session);
  const where: Prisma.SupplierWhereInput = {};
  if (filters?.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { serviceTypes: { contains: filters.q, mode: "insensitive" } },
    ];
  }
  return prisma.supplier.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      users: { select: { email: true, active: true } },
      _count: { select: { serviceOrders: true } },
    },
  });
}

export async function getSupplier(session: SessionUser, id: string) {
  requireViewer(session);
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { users: { select: { email: true, active: true } } },
  });
  if (!supplier) throw new NotFoundError("Proveedor no encontrado");
  return supplier;
}

export async function createSupplier(
  session: SessionUser,
  input: SupplierInput,
  login?: { email: string; password: string },
) {
  requireManager(session);
  return prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({ data: input });
    if (login) {
      const existing = await tx.user.findUnique({ where: { email: login.email.toLowerCase() } });
      if (existing) throw new ValidationError("Ya existe un usuario con ese email");
      await tx.user.create({
        data: {
          email: login.email.toLowerCase(),
          name: input.contactName ?? input.name,
          passwordHash: await hash(login.password, 10),
          role: Role.SUPPLIER,
          supplierId: supplier.id,
        },
      });
    }
    return supplier;
  });
}

export async function updateSupplier(session: SessionUser, id: string, input: SupplierInput) {
  requireManager(session);
  await getSupplier(session, id);
  return prisma.supplier.update({ where: { id }, data: input });
}
