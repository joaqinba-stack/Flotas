import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { systemBuildSessionUser } from "@/lib/data/users";
import { Role } from "@/lib/data/types";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export type SessionUser = {
  userId: string;
  email: string;
  name: string;
  role: Role;
  orgUnitId: string | null;
  orgPath: string | null;
  driverId: string | null;
  supplierId: string | null;
};

// Ruta que cierra la sesión y limpia la cookie. No se puede redirigir directo
// a /login: el middleware ve un JWT todavía criptográficamente válido y rebota
// a /panel, que vuelve a rechazar — loop infinito de redirects.
const STALE_SESSION_PATH = "/api/sesion-invalida";

type SessionLookup =
  | { kind: "anon" }
  | { kind: "stale" }
  | { kind: "ok"; user: SessionUser };

// El JWT lleva los claims congelados del momento del login (rol, unidad,
// incluso la existencia del usuario) y dura 30 días. Si el usuario fue dado de
// baja, le cambiaron el rol, o el token quedó de otra base —volumen de Postgres
// recreado, entorno distinto—, esos claims son mentira: confiar en ellos hacía
// que cualquier escritura con createdById reventara con un 500 por foreign key.
// Se reconstruye siempre desde la base: es un lookup por clave primaria.
async function lookupSession(): Promise<SessionLookup> {
  const session = await auth();
  if (!session?.user?.id) return { kind: "anon" };
  const user = await systemBuildSessionUser(session.user.id);
  if (!user) return { kind: "stale" };
  return { kind: "ok", user };
}

export function homePathFor(role: Role): string {
  switch (role) {
    case Role.DRIVER:
      return "/conductor";
    case Role.SUPPLIER:
      return "/proveedor";
    case Role.DESK_AGENT:
      return "/desk";
    default:
      return "/panel";
  }
}

// Para Server Components / Server Actions: redirige si no cumple.
export async function requireSession(...roles: Role[]): Promise<SessionUser> {
  const found = await lookupSession();
  if (found.kind === "anon") redirect("/login");
  if (found.kind === "stale") redirect(STALE_SESSION_PATH);
  const { user } = found;
  if (roles.length > 0 && user.role !== Role.ADMIN && !roles.includes(user.role)) {
    redirect(homePathFor(user.role));
  }
  return user;
}

// Para Route Handlers: lanza ApiError que lib/api traduce a 401/403.
export async function requireApiSession(...roles: Role[]): Promise<SessionUser> {
  const found = await lookupSession();
  if (found.kind !== "ok") throw new UnauthorizedError();
  const { user } = found;
  if (roles.length > 0 && user.role !== Role.ADMIN && !roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}
