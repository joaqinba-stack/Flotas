import { Prisma, Role } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { buildOrgScopeWhere, assertPathInScope } from "@/lib/auth/scope";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

function orgUnitScopeWhere(session: SessionUser): Prisma.OrgUnitWhereInput {
  if (session.role === Role.ADMIN) return {};
  if (session.role === Role.SUPERVISOR || session.role === Role.DESK_AGENT) {
    if (!session.orgPath) throw new ForbiddenError();
    return { path: { startsWith: session.orgPath } };
  }
  throw new ForbiddenError();
}

export async function listOrgUnits(session: SessionUser) {
  return prisma.orgUnit.findMany({
    where: orgUnitScopeWhere(session),
    orderBy: { path: "asc" },
    include: { _count: { select: { users: true, drivers: true, vehicles: true, children: true } } },
  });
}

export async function getOrgUnit(session: SessionUser, id: string) {
  const unit = await prisma.orgUnit.findFirst({
    where: { id, AND: [orgUnitScopeWhere(session)] },
    include: { parent: true },
  });
  if (!unit) throw new NotFoundError("Unidad organizacional no encontrada");
  return unit;
}

export async function createOrgUnit(
  session: SessionUser,
  input: { name: string; kind: "DIRECCION" | "DEPARTAMENTO" | "BASE_LOGISTICA"; parentId: string | null },
) {
  if (session.role !== Role.ADMIN) throw new ForbiddenError("Solo ADMIN modifica el organigrama");
  let parentPath = "/";
  if (input.parentId) {
    const parent = await prisma.orgUnit.findUnique({ where: { id: input.parentId } });
    if (!parent) throw new NotFoundError("Unidad padre no encontrada");
    parentPath = parent.path;
  }
  const id = randomUUID();
  return prisma.orgUnit.create({
    data: { id, name: input.name, kind: input.kind, parentId: input.parentId, path: `${parentPath}${id}/` },
  });
}

export async function updateOrgUnit(
  session: SessionUser,
  id: string,
  input: { name: string; kind: "DIRECCION" | "DEPARTAMENTO" | "BASE_LOGISTICA"; parentId: string | null },
) {
  if (session.role !== Role.ADMIN) throw new ForbiddenError("Solo ADMIN modifica el organigrama");
  const unit = await prisma.orgUnit.findUnique({ where: { id } });
  if (!unit) throw new NotFoundError();

  let newPath = unit.path;
  if ((input.parentId ?? null) !== unit.parentId) {
    let parentPath = "/";
    if (input.parentId) {
      const parent = await prisma.orgUnit.findUnique({ where: { id: input.parentId } });
      if (!parent) throw new NotFoundError("Unidad padre no encontrada");
      if (parent.path.startsWith(unit.path)) {
        throw new ValidationError("No se puede mover una unidad dentro de su propio subárbol");
      }
      parentPath = parent.path;
    }
    newPath = `${parentPath}${id}/`;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.orgUnit.update({
      where: { id },
      data: { name: input.name, kind: input.kind, parentId: input.parentId, path: newPath },
    });
    if (newPath !== unit.path) {
      const descendants = await tx.orgUnit.findMany({
        where: { path: { startsWith: unit.path }, id: { not: id } },
      });
      for (const d of descendants) {
        await tx.orgUnit.update({
          where: { id: d.id },
          data: { path: newPath + d.path.slice(unit.path.length) },
        });
      }
    }
    return updated;
  });
}

export async function deleteOrgUnit(session: SessionUser, id: string) {
  if (session.role !== Role.ADMIN) throw new ForbiddenError("Solo ADMIN modifica el organigrama");
  const unit = await prisma.orgUnit.findUnique({
    where: { id },
    include: { _count: { select: { children: true, users: true, drivers: true, vehicles: true } } },
  });
  if (!unit) throw new NotFoundError();
  const c = unit._count;
  if (c.children || c.users || c.drivers || c.vehicles) {
    throw new ValidationError("La unidad tiene dependencias (subunidades, usuarios, conductores o vehículos)");
  }
  return prisma.orgUnit.delete({ where: { id } });
}

// Para validar en mutaciones que un orgUnit destino está dentro del alcance del actor.
export async function assertOrgUnitInScope(session: SessionUser, orgUnitId: string) {
  const unit = await prisma.orgUnit.findUnique({ where: { id: orgUnitId } });
  if (!unit) throw new NotFoundError("Unidad organizacional no encontrada");
  assertPathInScope(session, unit.path);
  return unit;
}

export { buildOrgScopeWhere };
