import { prisma } from "./prisma";

// Lookup interno de autenticación (pre-sesión): no aplica scoping porque solo
// lo consume el provider de credenciales de Auth.js.
export async function findUserForAuth(email: string) {
  return prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { orgUnit: { select: { path: true } } },
  });
}
