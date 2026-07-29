import Link from "next/link";
import { signOut } from "@/lib/auth";
import { homePathFor, type SessionUser } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { SidebarNav, type NavSection } from "./sidebar-nav";

const ADMIN_NAV: NavSection[] = [
  {
    title: "Flota",
    links: [
      { href: "/panel", label: "Panel" },
      { href: "/flota", label: "Vehículos" },
      { href: "/conductores", label: "Conductores" },
      { href: "/organigrama", label: "Organigrama" },
      { href: "/mapa", label: "Mapa en vivo" },
    ],
  },
  {
    title: "Inventario",
    links: [
      { href: "/combustible", label: "Combustible" },
      { href: "/neumaticos", label: "Neumáticos" },
      { href: "/activos", label: "Activos auxiliares" },
    ],
  },
  {
    title: "Operación",
    links: [
      { href: "/jornadas", label: "Jornadas operativas" },
      { href: "/incidentes", label: "Incidencias" },
      { href: "/proveedores", label: "Proveedores" },
      { href: "/ordenes", label: "Órdenes de servicio" },
    ],
  },
  {
    title: "Telemetría",
    links: [
      { href: "/alertas", label: "Alertas" },
      { href: "/geocercas", label: "Geocercas" },
    ],
  },
  {
    title: "Análisis",
    links: [{ href: "/reportes", label: "Reportes" }],
  },
];

// Solo visible para ADMIN (el middleware bloquea /usuarios para el resto).
const ADMIN_ONLY_SECTION: NavSection = {
  title: "Administración",
  links: [
    { href: "/usuarios", label: "Usuarios" },
    { href: "/datos", label: "Datos" },
  ],
};

const DRIVER_NAV: NavSection[] = [
  {
    title: "Mi operación",
    links: [
      { href: "/conductor", label: "Mi panel" },
      { href: "/conductor/jornadas", label: "Mis jornadas" },
      { href: "/conductor/combustible", label: "Mis cargas" },
      { href: "/conductor/legajo", label: "Mi legajo" },
    ],
  },
];

const SUPPLIER_NAV: NavSection[] = [
  {
    title: "Portal proveedor",
    links: [{ href: "/proveedor", label: "Mis órdenes" }],
  },
];

const DESK_NAV: NavSection[] = [
  {
    title: "Mesa 24/7",
    links: [
      { href: "/desk", label: "Cola de tickets" },
      { href: "/desk/planificacion", label: "Planificación" },
      { href: "/mapa", label: "Mapa en vivo" },
    ],
  },
];

function navFor(role: Role): NavSection[] {
  switch (role) {
    case Role.DRIVER:
      return DRIVER_NAV;
    case Role.SUPPLIER:
      return SUPPLIER_NAV;
    case Role.DESK_AGENT:
      return DESK_NAV;
    default:
      return ADMIN_NAV;
  }
}

// El mapa en vivo solo está habilitado para estos roles (mismo criterio que
// ROUTE_ROLES en middleware.ts): para el resto la marca lleva a su propia home,
// así el click no termina en un rebote del middleware.
const MAP_ROLES: Role[] = [Role.ADMIN, Role.SUPERVISOR, Role.DESK_AGENT];

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  DRIVER: "Conductor",
  SUPPLIER: "Proveedor",
  DESK_AGENT: "Mesa de asistencia",
};

export function Sidebar({ session }: { session: SessionUser }) {
  const sections =
    session.role === Role.ADMIN
      ? [...navFor(session.role), ADMIN_ONLY_SECTION]
      : navFor(session.role);
  const brandHref = MAP_ROLES.includes(session.role) ? "/mapa" : homePathFor(session.role);
  return (
    <aside className="ds sidebar">
      <Link className="brand" href={brandHref}>
        {/* eslint-disable-next-line @next/next/no-img-element -- estático en
            public/, no necesita la optimización ni el runtime de next/image */}
        <img
          className="brand-logo"
          src="/Logo-conatel.png"
          alt="CONATEL — Comisión Nacional de Telecomunicaciones"
          width={40}
          height={34}
        />
        <span className="brand-text">
          FLOTAS
          <small>Parque automotor institucional</small>
        </span>
      </Link>
      <SidebarNav sections={sections} />
      <div className="session-box">
        <strong>{session.name}</strong>
        {ROLE_LABEL[session.role]}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn btn-secondary btn-block" type="submit">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
