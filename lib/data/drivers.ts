import { Prisma, Role, DriverStatus } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertOrgUnitInScope } from "./org-units";

function driverScopeWhere(session: SessionUser): Prisma.DriverWhereInput {
  if (session.role === Role.DRIVER) {
    if (!session.driverId) throw new ForbiddenError();
    return { id: session.driverId };
  }
  if (session.role === Role.SUPPLIER) throw new ForbiddenError();
  return buildOrgScopeWhere(session) as Prisma.DriverWhereInput;
}

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type DriverInput = {
  firstName: string;
  lastName: string;
  documentId: string;
  licenseNumber: string;
  licenseCategory: string;
  licenseExpiry: Date;
  phone: string | null;
  status: DriverStatus;
  orgUnitId: string;
};

export async function listDrivers(
  session: SessionUser,
  filters?: { q?: string; status?: DriverStatus },
) {
  const where: Prisma.DriverWhereInput = { AND: [driverScopeWhere(session)] };
  if (filters?.status) where.status = filters.status;
  if (filters?.q) {
    where.OR = [
      { firstName: { contains: filters.q, mode: "insensitive" } },
      { lastName: { contains: filters.q, mode: "insensitive" } },
      { documentId: { contains: filters.q } },
    ];
  }
  return prisma.driver.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: {
      orgUnit: { select: { id: true, name: true } },
      user: { select: { email: true, active: true } },
      assignedVehicles: { select: { id: true, plate: true } },
    },
  });
}

export async function getDriver(session: SessionUser, id: string) {
  const driver = await prisma.driver.findFirst({
    where: { id, AND: [driverScopeWhere(session)] },
    include: {
      orgUnit: true,
      user: { select: { email: true, active: true } },
      assignedVehicles: { select: { id: true, plate: true, brand: true, model: true } },
    },
  });
  if (!driver) throw new NotFoundError("Conductor no encontrado");
  return driver;
}

export async function createDriver(
  session: SessionUser,
  input: DriverInput,
  login?: { email: string; password: string },
) {
  requireManager(session);
  await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.$transaction(async (tx) => {
    const driver = await tx.driver.create({ data: input });
    if (login) {
      const existing = await tx.user.findUnique({ where: { email: login.email.toLowerCase() } });
      if (existing) throw new ValidationError("Ya existe un usuario con ese email");
      await tx.user.create({
        data: {
          email: login.email.toLowerCase(),
          name: `${input.firstName} ${input.lastName}`,
          passwordHash: await hash(login.password, 10),
          role: Role.DRIVER,
          orgUnitId: input.orgUnitId,
          driverId: driver.id,
        },
      });
    }
    return driver;
  });
}

export async function updateDriver(session: SessionUser, id: string, input: DriverInput) {
  requireManager(session);
  await getDriver(session, id);
  await assertOrgUnitInScope(session, input.orgUnitId);
  return prisma.driver.update({ where: { id }, data: input });
}
