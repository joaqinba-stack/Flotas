import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import {
  VehicleStatus,
  DriverStatus,
  FuelValidationStatus,
  JornadaStatus,
  IncidentStatus,
  IncidentUrgency,
  AlertStatus,
  AlertType,
  AlertSeverity,
} from "@/lib/data/types";

export type ColumnDef = { key: string; label: string };

const dateRangeFilter = {
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const DATASET_FILTER_SCHEMAS = {
  VEHICLES: z.object({
    status: z.nativeEnum(VehicleStatus).optional(),
    orgUnitId: z.string().optional(),
  }),
  DRIVERS: z.object({
    status: z.nativeEnum(DriverStatus).optional(),
  }),
  FUEL_LOADS: z.object({
    vehicleId: z.string().optional(),
    validationStatus: z.nativeEnum(FuelValidationStatus).optional(),
    ...dateRangeFilter,
  }),
  JORNADAS: z.object({
    status: z.nativeEnum(JornadaStatus).optional(),
    vehicleId: z.string().optional(),
    driverId: z.string().optional(),
    ...dateRangeFilter,
  }),
  INCIDENTS: z.object({
    status: z.nativeEnum(IncidentStatus).optional(),
    urgency: z.nativeEnum(IncidentUrgency).optional(),
    vehicleId: z.string().optional(),
  }),
  ALERTS: z.object({
    status: z.nativeEnum(AlertStatus).optional(),
    type: z.nativeEnum(AlertType).optional(),
    severity: z.nativeEnum(AlertSeverity).optional(),
    vehicleId: z.string().optional(),
  }),
} as const;

export type ReportDatasetId = keyof typeof DATASET_FILTER_SCHEMAS;

export const DATASET_COLUMNS: Record<ReportDatasetId, ColumnDef[]> = {
  VEHICLES: [
    { key: "plate", label: "Placa" },
    { key: "brand", label: "Marca" },
    { key: "model", label: "Modelo" },
    { key: "year", label: "Año" },
    { key: "fuelType", label: "Combustible" },
    { key: "odometerKm", label: "Odómetro (km)" },
    { key: "status", label: "Estado" },
    { key: "orgUnit", label: "Unidad" },
    { key: "currentDriver", label: "Conductor asignado" },
  ],
  DRIVERS: [
    { key: "lastName", label: "Apellido" },
    { key: "firstName", label: "Nombre" },
    { key: "documentId", label: "Documento" },
    { key: "licenseNumber", label: "Licencia" },
    { key: "licenseCategory", label: "Categoría" },
    { key: "licenseExpiry", label: "Vencimiento licencia" },
    { key: "status", label: "Estado" },
    { key: "orgUnit", label: "Unidad" },
  ],
  FUEL_LOADS: [
    { key: "loadedAt", label: "Fecha de carga" },
    { key: "vehiclePlate", label: "Vehículo" },
    { key: "driver", label: "Conductor" },
    { key: "liters", label: "Litros" },
    { key: "odometerKm", label: "Odómetro (km)" },
    { key: "totalCost", label: "Costo total" },
    { key: "validationStatus", label: "Validación" },
    { key: "station", label: "Estación" },
  ],
  JORNADAS: [
    { key: "purpose", label: "Propósito" },
    { key: "vehiclePlate", label: "Vehículo" },
    { key: "driver", label: "Conductor" },
    { key: "orgUnit", label: "Unidad" },
    { key: "plannedStart", label: "Inicio planificado" },
    { key: "plannedEnd", label: "Fin planificado" },
    { key: "actualStart", label: "Inicio real" },
    { key: "actualEnd", label: "Fin real" },
    { key: "status", label: "Estado" },
  ],
  INCIDENTS: [
    { key: "code", label: "N°" },
    { key: "title", label: "Título" },
    { key: "vehiclePlate", label: "Vehículo" },
    { key: "driver", label: "Conductor" },
    { key: "category", label: "Categoría" },
    { key: "urgency", label: "Urgencia" },
    { key: "status", label: "Estado" },
    { key: "occurredAt", label: "Ocurrió" },
  ],
  ALERTS: [
    { key: "type", label: "Tipo" },
    { key: "severity", label: "Severidad" },
    { key: "status", label: "Estado" },
    { key: "vehiclePlate", label: "Vehículo" },
    { key: "message", label: "Mensaje" },
    { key: "occurredAt", label: "Ocurrió" },
  ],
};

export const DATASET_LABELS: Record<ReportDatasetId, string> = {
  VEHICLES: "Vehículos",
  DRIVERS: "Conductores",
  FUEL_LOADS: "Cargas de combustible",
  JORNADAS: "Jornadas operativas",
  INCIDENTS: "Incidencias",
  ALERTS: "Alertas",
};

export const reportColumnsSchema = z.array(z.string()).min(1, "Seleccione al menos una columna");

export function validDatasetId(value: string): value is ReportDatasetId {
  return value in DATASET_FILTER_SCHEMAS;
}

export function parseDatasetFilters(dataset: ReportDatasetId, raw: unknown) {
  return DATASET_FILTER_SCHEMAS[dataset].parse(raw ?? {});
}

export function validateColumns(dataset: ReportDatasetId, columns: string[]): string[] {
  const allowed = new Set(DATASET_COLUMNS[dataset].map((c) => c.key));
  const invalid = columns.filter((c) => !allowed.has(c));
  if (invalid.length > 0) {
    throw new ValidationError(`Columnas inválidas para ${dataset}: ${invalid.join(", ")}`);
  }
  return columns;
}
