import { Role } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { CATALOGS, findCatalog, type CatalogDef } from "@/lib/catalogs/registry";

export type CatalogOption = {
  code: string;
  label: string;
  active: boolean;
  sortOrder: number;
  /** true si el valor está fijado por un enum: se edita la etiqueta, no el código. */
  fixed: boolean;
};

function requireCatalog(name: string): CatalogDef {
  const def = findCatalog(name);
  if (!def) throw new NotFoundError("Catálogo no encontrado");
  return def;
}

/**
 * Opciones de un catálogo, con los overrides de la base ya aplicados.
 *
 * Para catálogos de enum el conjunto de códigos siempre sale del registro: la
 * base solo puede cambiar etiqueta, orden y si está activo. Así un catálogo sin
 * filas (lo normal recién instalado) sigue devolviendo las opciones correctas.
 */
export async function listCatalogOptions(
  name: string,
  opts: { includeInactive?: boolean } = {},
): Promise<CatalogOption[]> {
  const def = requireCatalog(name);
  const rows = await prisma.catalogItem.findMany({ where: { catalog: name } });
  const byCode = new Map(rows.map((r) => [r.code, r]));

  if (def.kind === "enum") {
    const options = (def.values ?? []).map((v, i) => {
      const row = byCode.get(v.code);
      return {
        code: v.code,
        label: row?.label ?? v.label,
        active: row?.active ?? true,
        sortOrder: row?.sortOrder ?? i,
        fixed: true,
      };
    });
    options.sort((a, b) => a.sortOrder - b.sortOrder);
    return opts.includeInactive ? options : options.filter((o) => o.active);
  }

  const options = rows.map((r) => ({
    code: r.code,
    label: r.label,
    active: r.active,
    sortOrder: r.sortOrder,
    fixed: false,
  }));
  options.sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
  return opts.includeInactive ? options : options.filter((o) => o.active);
}

/** Mapa código → etiqueta, para render de tablas y badges. */
export async function catalogLabels(name: string): Promise<Record<string, string>> {
  const options = await listCatalogOptions(name, { includeInactive: true });
  return Object.fromEntries(options.map((o) => [o.code, o.label]));
}

/** Varios catálogos de una, para formularios que necesitan más de uno. */
export async function listManyCatalogs(names: string[]): Promise<Record<string, CatalogOption[]>> {
  const entries = await Promise.all(
    names.map(async (n) => [n, await listCatalogOptions(n)] as const),
  );
  return Object.fromEntries(entries);
}

export function listCatalogDefs() {
  return CATALOGS;
}

function assertAdmin(session: SessionUser) {
  if (session.role !== Role.ADMIN) throw new ForbiddenError("Solo ADMIN edita los catálogos");
}

export async function createCatalogItem(
  session: SessionUser,
  catalog: string,
  input: { code: string; label: string; sortOrder: number },
) {
  assertAdmin(session);
  const def = requireCatalog(catalog);
  if (def.kind === "enum") {
    throw new ValidationError(
      "Este catálogo está fijado por el sistema: se puede renombrar, no agregar valores",
    );
  }
  const exists = await prisma.catalogItem.findUnique({
    where: { catalog_code: { catalog, code: input.code } },
  });
  if (exists) throw new ValidationError(`Ya existe un valor con el código "${input.code}"`);
  return prisma.catalogItem.create({
    data: { catalog, code: input.code, label: input.label, sortOrder: input.sortOrder },
  });
}

/**
 * Alta o modificación del override. Para catálogos de enum la fila puede no
 * existir todavía (la etiqueta venía del registro), así que se hace upsert
 * contra el código en vez de update por id.
 */
export async function saveCatalogItem(
  session: SessionUser,
  catalog: string,
  code: string,
  input: { label: string; sortOrder: number; active: boolean },
) {
  assertAdmin(session);
  const def = requireCatalog(catalog);

  if (def.kind === "enum" && !(def.values ?? []).some((v) => v.code === code)) {
    throw new NotFoundError("Valor no encontrado en el catálogo");
  }
  if (def.kind === "libre") {
    const exists = await prisma.catalogItem.findUnique({
      where: { catalog_code: { catalog, code } },
    });
    if (!exists) throw new NotFoundError("Valor no encontrado en el catálogo");
  }

  return prisma.catalogItem.upsert({
    where: { catalog_code: { catalog, code } },
    update: { label: input.label, sortOrder: input.sortOrder, active: input.active },
    create: {
      catalog,
      code,
      label: input.label,
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
}

export async function deleteCatalogItem(session: SessionUser, catalog: string, code: string) {
  assertAdmin(session);
  const def = requireCatalog(catalog);
  if (def.kind === "enum") {
    throw new ValidationError(
      "Este catálogo está fijado por el sistema: desactivá el valor en lugar de borrarlo",
    );
  }
  const inUse = await countCatalogUsage(catalog, code);
  if (inUse > 0) {
    throw new ValidationError(
      `El valor está en uso en ${inUse} registro(s). Desactivalo para que deje de ofrecerse.`,
    );
  }
  await prisma.catalogItem.delete({ where: { catalog_code: { catalog, code } } });
}

/**
 * Cuántos registros usan un valor de catálogo libre. Los campos son texto suelto
 * en la base, así que se cuenta contra la columna real de cada modelo.
 */
export async function countCatalogUsage(catalog: string, code: string): Promise<number> {
  switch (catalog) {
    case "LICENSE_CATEGORY":
      return prisma.driver.count({ where: { licenseCategory: code } });
    case "VEHICLE_TYPE":
      return prisma.vehicle.count({ where: { type: code } });
    case "VEHICLE_BRAND":
      return prisma.vehicle.count({ where: { brand: code } });
    case "INCIDENT_CATEGORY":
      return prisma.incident.count({ where: { category: code } });
    case "FUEL_STATION":
      return prisma.fuelLoad.count({ where: { station: code } });
    default:
      return 0;
  }
}

/**
 * Valores que ya están en la base pero no figuran en el catálogo. Sirve para
 * que el admin adopte lo que se cargó como texto libre antes de tener catálogo,
 * en vez de que quede invisible.
 */
export async function listOrphanValues(catalog: string): Promise<Array<{ code: string; count: number }>> {
  const def = requireCatalog(catalog);
  if (def.kind === "enum") return [];

  const known = new Set((await listCatalogOptions(catalog, { includeInactive: true })).map((o) => o.code));
  let used: Array<{ value: string | null; count: number }> = [];

  switch (catalog) {
    case "LICENSE_CATEGORY": {
      const g = await prisma.driver.groupBy({ by: ["licenseCategory"], _count: { _all: true } });
      used = g.map((r) => ({ value: r.licenseCategory, count: r._count._all }));
      break;
    }
    case "VEHICLE_TYPE": {
      const g = await prisma.vehicle.groupBy({ by: ["type"], _count: { _all: true } });
      used = g.map((r) => ({ value: r.type, count: r._count._all }));
      break;
    }
    case "VEHICLE_BRAND": {
      const g = await prisma.vehicle.groupBy({ by: ["brand"], _count: { _all: true } });
      used = g.map((r) => ({ value: r.brand, count: r._count._all }));
      break;
    }
    case "INCIDENT_CATEGORY": {
      const g = await prisma.incident.groupBy({ by: ["category"], _count: { _all: true } });
      used = g.map((r) => ({ value: r.category, count: r._count._all }));
      break;
    }
    case "FUEL_STATION": {
      const g = await prisma.fuelLoad.groupBy({ by: ["station"], _count: { _all: true } });
      used = g.map((r) => ({ value: r.station, count: r._count._all }));
      break;
    }
  }

  return used
    .filter((r): r is { value: string; count: number } => !!r.value && !known.has(r.value))
    .map((r) => ({ code: r.value, count: r.count }))
    .sort((a, b) => b.count - a.count);
}
