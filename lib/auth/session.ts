import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
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

async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user;
  return {
    userId: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    orgUnitId: u.orgUnitId,
    orgPath: u.orgPath,
    driverId: u.driverId,
    supplierId: u.supplierId,
  };
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
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roles.length > 0 && user.role !== Role.ADMIN && !roles.includes(user.role)) {
    redirect(homePathFor(user.role));
  }
  return user;
}

// Para Route Handlers: lanza ApiError que lib/api traduce a 401/403.
export async function requireApiSession(...roles: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  if (roles.length > 0 && user.role !== Role.ADMIN && !roles.includes(user.role)) {
    throw new ForbiddenError();
  }
  return user;
}
