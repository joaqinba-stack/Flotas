"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavSection = { title: string; links: Array<{ href: string; label: string }> };

// Un link manda en su propia ruta y en las que cuelgan de ella, para que
// /flota/abc/editar siga marcando "Vehículos".
function matches(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// Gana el href más largo: en /conductor/jornadas deben quedar marcadas "Mis
// jornadas" y no "Mi panel", que también hace prefijo.
function findActiveHref(pathname: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const link of section.links) {
      if (matches(pathname, link.href) && (best === null || link.href.length > best.length)) {
        best = link.href;
      }
    }
  }
  return best;
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  const activeHref = findActiveHref(pathname, sections);
  const activeSection =
    sections.find((s) => s.links.some((l) => l.href === activeHref))?.title ?? null;

  // El diseño arranca con todas las secciones plegadas, pero así el usuario
  // aterriza sin un solo link a la vista y sin pista de dónde está parado.
  // Abrimos la que contiene la ruta actual.
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(activeSection ? [activeSection] : []),
  );

  // El sidebar vive en el layout y no se remonta al navegar, así que la
  // sección de destino se abre sola. Respeta las que el usuario abrió a mano.
  useEffect(() => {
    if (!activeSection) return;
    setOpen((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
  }, [activeSection]);

  function toggle(title: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(title)) next.add(title);
      return next;
    });
  }

  return (
    <nav>
      {sections.map((section, i) => {
        const expanded = open.has(section.title);
        const panelId = `nav-section-${i}`;
        return (
          <div key={section.title}>
            <button
              type="button"
              className="nav-section"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => toggle(section.title)}
            >
              <span>{section.title}</span>
              <span className="chev" aria-hidden="true">
                {expanded ? "▾" : "▸"}
              </span>
            </button>
            {expanded && (
              <div id={panelId}>
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={link.href === activeHref ? "page" : undefined}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
