// Definición de los catálogos editables desde Administración → Datos.
//
// Hay dos clases y la diferencia es deliberada:
//
//  - `enum`: respaldados por un enum de Postgres. El código de la app decide
//    con esos valores (el panel cuenta `status === "ACTIVE"`, el motor de
//    alertas reacciona a `SPEEDING`), así que agregar o borrar valores desde la
//    UI rompería consultas y datos ya guardados. Se puede editar la etiqueta y
//    el orden; el valor es fijo.
//
//  - `libre`: campos que hoy son texto suelto en la base (categoría de
//    licencia, marca, tipo de incidente). Nada en el código depende de un valor
//    puntual, así que admiten alta, baja y modificación completas.
//
// Las etiquetas por defecto viven acá, no en la base: un catálogo sin filas
// sigue mostrando valores correctos, y la tabla solo guarda lo que el usuario
// cambió.

export type CatalogKind = "enum" | "libre";

export type CatalogDef = {
  /** Identificador estable; es el que va en la URL y en CatalogItem.catalog. */
  name: string;
  label: string;
  description: string;
  kind: CatalogKind;
  /** Solo para kind "enum": valores fijos con su etiqueta por defecto. */
  values?: Array<{ code: string; label: string }>;
  /** Dónde se usa, para mostrarlo en la UI. */
  usedIn: string;
};

export const CATALOGS: CatalogDef[] = [
  // ---- Respaldados por enum: etiqueta editable, valores fijos ----
  {
    name: "DriverStatus",
    label: "Estado de conductor",
    description: "Situación del conductor en el legajo.",
    kind: "enum",
    usedIn: "Conductores",
    values: [
      { code: "ACTIVE", label: "Activo" },
      { code: "INACTIVE", label: "Inactivo" },
      { code: "SUSPENDED", label: "Suspendido" },
    ],
  },
  {
    name: "VehicleStatus",
    label: "Estado de vehículo",
    description: "Disponibilidad operativa de la unidad.",
    kind: "enum",
    usedIn: "Vehículos",
    values: [
      { code: "ACTIVE", label: "Activo" },
      { code: "IN_MAINTENANCE", label: "En mantenimiento" },
      { code: "OUT_OF_SERVICE", label: "Fuera de servicio" },
    ],
  },
  {
    name: "FuelType",
    label: "Tipo de combustible",
    description: "Combustible de la unidad y de las cargas.",
    kind: "enum",
    usedIn: "Vehículos · Combustible",
    values: [
      { code: "NAFTA", label: "Nafta" },
      { code: "DIESEL", label: "Diésel" },
      { code: "GNC", label: "GNC" },
      { code: "ELECTRICO", label: "Eléctrico" },
    ],
  },
  {
    name: "IncidentUrgency",
    label: "Urgencia de incidencia",
    description: "Prioridad con la que se atiende la incidencia.",
    kind: "enum",
    usedIn: "Incidencias",
    values: [
      { code: "LOW", label: "Baja" },
      { code: "MEDIUM", label: "Media" },
      { code: "HIGH", label: "Alta" },
      { code: "CRITICAL", label: "Crítica" },
    ],
  },
  {
    name: "OrgUnitKind",
    label: "Tipo de unidad organizacional",
    description: "Nivel de la unidad dentro del organigrama.",
    kind: "enum",
    usedIn: "Organigrama",
    values: [
      { code: "DIRECCION", label: "Dirección" },
      { code: "DEPARTAMENTO", label: "Departamento" },
      { code: "BASE_LOGISTICA", label: "Base logística" },
    ],
  },

  // ---- Libres: ABM completo ----
  {
    name: "LICENSE_CATEGORY",
    label: "Categorías de licencia",
    description: "Categorías habilitantes de la licencia de conducir.",
    kind: "libre",
    usedIn: "Conductores",
  },
  {
    name: "VEHICLE_TYPE",
    label: "Tipos de vehículo",
    description: "Clasificación de la unidad (camioneta, camión, utilitario…).",
    kind: "libre",
    usedIn: "Vehículos",
  },
  {
    name: "VEHICLE_BRAND",
    label: "Marcas de vehículo",
    description: "Marcas disponibles al dar de alta una unidad.",
    kind: "libre",
    usedIn: "Vehículos",
  },
  {
    name: "INCIDENT_CATEGORY",
    label: "Categorías de incidencia",
    description: "Clasificación de la incidencia reportada.",
    kind: "libre",
    usedIn: "Incidencias",
  },
  {
    name: "FUEL_STATION",
    label: "Estaciones de servicio",
    description: "Estaciones habituales donde se cargan las unidades.",
    kind: "libre",
    usedIn: "Combustible",
  },
];

export function findCatalog(name: string): CatalogDef | undefined {
  return CATALOGS.find((c) => c.name === name);
}
