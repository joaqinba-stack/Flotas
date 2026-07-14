import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth/config";

const { auth } = NextAuth(authConfig);

// Guard grueso por prefijo de ruta. El scoping fino vive siempre en lib/data.
const ROUTE_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: "/panel", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/flota", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/conductores", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/organigrama", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/combustible", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/neumaticos", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/activos", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/jornadas", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/incidentes", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/proveedores", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/ordenes", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/alertas", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/geocercas", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/reportes", roles: ["ADMIN", "SUPERVISOR"] },
  { prefix: "/mapa", roles: ["ADMIN", "SUPERVISOR", "DESK_AGENT"] },
  { prefix: "/conductor", roles: ["DRIVER"] },
  { prefix: "/proveedor", roles: ["SUPPLIER"] },
  { prefix: "/desk", roles: ["ADMIN", "DESK_AGENT"] },
];

const HOME_BY_ROLE: Record<string, string> = {
  ADMIN: "/panel",
  SUPERVISOR: "/panel",
  DRIVER: "/conductor",
  SUPPLIER: "/proveedor",
  DESK_AGENT: "/desk",
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  if (pathname === "/login") {
    if (user) {
      return NextResponse.redirect(new URL(HOME_BY_ROLE[user.role] ?? "/", req.nextUrl));
    }
    return NextResponse.next();
  }

  if (!user) {
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const rule = ROUTE_ROLES.find(
    (r) => pathname === r.prefix || pathname.startsWith(r.prefix + "/"),
  );
  if (rule && user.role !== "ADMIN" && !rule.roles.includes(user.role)) {
    return NextResponse.redirect(new URL(HOME_BY_ROLE[user.role] ?? "/login", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
