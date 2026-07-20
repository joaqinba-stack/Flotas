import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

function requireAdmin(session: SessionUser) {
  if (session.role !== Role.ADMIN) throw new ForbiddenError();
}

// Roles que se gestionan desde la pantalla Usuarios; DRIVER y SUPPLIER nacen
// desde Conductores/Proveedores para no romper el vínculo con su entidad.
const MANAGED: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DESK_AGENT];

// Lookup interno de autenticación (pre-sesión): no aplica scoping porque solo
// lo consume el provider de credenciales de Auth.js.
export async function findUserForAuth(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { orgUnit: { select: { path: true } } },
  });
}

// Reconstruye una sesión equivalente para jobs de sistema (generación async
// de reportes) que deben ejecutar con el alcance ACTUAL del usuario que pidió
// la corrida, nunca con privilegios propios del proceso worker.
export async function systemBuildSessionUser(userId: string): Promise<SessionUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { orgUnit: { select: { path: true } } },
  });
  if (!user || !user.active) return null;
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    orgUnitId: user.orgUnitId,
    orgPath: user.orgUnit?.path ?? null,
    driverId: user.driverId,
    supplierId: user.supplierId,
  };
}

// --- Gestión de usuarios (solo ADMIN) ---

export async function listUsers(session: SessionUser) {
  requireAdmin(session);
  return prisma.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      orgUnit: { select: { name: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
}

export async function getUser(session: SessionUser, id: string) {
  requireAdmin(session);
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orgUnit: { select: { id: true, name: true } },
      driver: { select: { id: true, firstName: true, lastName: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new NotFoundError("Usuario no encontrado");
  return user;
}

export async function createUser(
  session: SessionUser,
  input: { name: string; email: string; role: Role; orgUnitId: string | null; password: string },
) {
  requireAdmin(session);
  if (!MANAGED.includes(input.role)) {
    throw new ValidationError("Las cuentas de conductor y proveedor se crean desde sus secciones");
  }
  if (input.role !== Role.ADMIN && !input.orgUnitId) {
    throw new ValidationError("Los roles Supervisor y Mesa 24/7 requieren una unidad organizacional");
  }
  const email = input.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new ValidationError("Ya existe un usuario con ese email");
  return prisma.user.create({
    data: {
      name: input.name,
      email,
      role: input.role,
      orgUnitId: input.orgUnitId,
      passwordHash: await hash(input.password, 10),
    },
  });
}

export async function updateUser(
  session: SessionUser,
  id: string,
  input: { name: string; role?: Role; orgUnitId: string | null; active: boolean },
) {
  requireAdmin(session);
  const user = await getUser(session, id);

  // El rol solo se cambia entre roles administrables: un DRIVER/SUPPLIER
  // conserva el suyo (y su vínculo) aunque se editen nombre/estado.
  const roleChange = input.role && MANAGED.includes(user.role) ? input.role : undefined;

  const effectiveRole = roleChange ?? user.role;
  if ((effectiveRole === Role.SUPERVISOR || effectiveRole === Role.DESK_AGENT) && !input.orgUnitId) {
    throw new ValidationError("Los roles Supervisor y Mesa 24/7 requieren una unidad organizacional");
  }

  if (id === session.userId) {
    if (!input.active) throw new ValidationError("No podés desactivar tu propia cuenta");
    if (roleChange && roleChange !== user.role) {
      throw new ValidationError("No podés cambiar tu propio rol");
    }
  }

  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      orgUnitId: input.orgUnitId,
      active: input.active,
      ...(roleChange ? { role: roleChange } : {}),
    },
  });
}

export async function setUserPassword(session: SessionUser, id: string, password: string) {
  requireAdmin(session);
  await getUser(session, id);
  return prisma.user.update({
    where: { id },
    data: { passwordHash: await hash(password, 10) },
  });
}
