import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";

type NavSection = { title: string; links: Array<{ href: string; label: string }> };

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

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: "Administrador",
  SUPERVISOR: "Supervisor",
  DRIVER: "Conductor",
  SUPPLIER: "Proveedor",
  DESK_AGENT: "Mesa de asistencia",
};

export function Sidebar({ session }: { session: SessionUser }) {
  const sections = navFor(session.role);
  return (
    <aside className="sidebar">
      <div className="brand">
        Flotas
        <small>Parque automotor institucional</small>
      </div>
      <nav>
        {sections.map((section) => (
          <div key={section.title}>
            <div className="nav-section">{section.title}</div>
            {section.links.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="session-box">
        <strong>{session.name}</strong>
        {ROLE_LABEL[session.role]}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button className="btn small secondary" style={{ marginTop: 8 }} type="submit">
            Cerrar sesión
          </button>
        </form>
      </div>
    </aside>
  );
}
