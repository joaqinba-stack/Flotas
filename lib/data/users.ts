import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";

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
