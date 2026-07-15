import type { SessionUser } from "@/lib/auth/session";
import { listVehicles } from "@/lib/data/vehicles";
import { listDrivers } from "@/lib/data/drivers";
import { listFuelLoads } from "@/lib/data/fuel-loads";
import { listJornadas } from "@/lib/data/jornadas";
import { listIncidents } from "@/lib/data/incidents";
import { listAlerts } from "@/lib/data/alerts";
import type { ReportDatasetId } from "./definitions";

type Row = Record<string, unknown>;

// Cada dataset delega en el repositorio ya scopeado de su fase de origen — el
// reporte nunca consulta Prisma directamente, hereda el mismo alcance por rol
// que el resto de la aplicación.
const FETCHERS: Record<ReportDatasetId, (session: SessionUser, filters: Record<string, unknown>) => Promise<Row[]>> = {
  async VEHICLES(session, filters) {
    const vehicles = await listVehicles(session, filters as Parameters<typeof listVehicles>[1]);
    return vehicles.map((v) => ({
      plate: v.plate,
      brand: v.brand,
      model: v.model,
      year: v.year,
      fuelType: v.fuelType,
      odometerKm: v.odometerKm,
      status: v.status,
      orgUnit: v.orgUnit.name,
      currentDriver: v.currentDriver ? `${v.currentDriver.lastName}, ${v.currentDriver.firstName}` : "",
    }));
  },
  async DRIVERS(session, filters) {
    const drivers = await listDrivers(session, filters as Parameters<typeof listDrivers>[1]);
    return drivers.map((d) => ({
      lastName: d.lastName,
      firstName: d.firstName,
      documentId: d.documentId,
      licenseNumber: d.licenseNumber,
      licenseCategory: d.licenseCategory,
      licenseExpiry: d.licenseExpiry,
      status: d.status,
      orgUnit: d.orgUnit.name,
    }));
  },
  async FUEL_LOADS(session, filters) {
    const loads = await listFuelLoads(session, filters as Parameters<typeof listFuelLoads>[1]);
    return loads.map((f) => ({
      loadedAt: f.loadedAt,
      vehiclePlate: f.vehicle.plate,
      driver: f.driver ? `${f.driver.lastName}, ${f.driver.firstName}` : "",
      liters: Number(f.liters),
      odometerKm: f.odometerKm,
      totalCost: f.totalCost ? Number(f.totalCost) : null,
      validationStatus: f.validationStatus,
      station: f.station ?? "",
    }));
  },
  async JORNADAS(session, filters) {
    const jornadas = await listJornadas(session, filters as Parameters<typeof listJornadas>[1]);
    return jornadas.map((j) => ({
      purpose: j.purpose,
      vehiclePlate: j.vehicle.plate,
      driver: `${j.driver.lastName}, ${j.driver.firstName}`,
      orgUnit: j.orgUnit.name,
      plannedStart: j.plannedStart,
      plannedEnd: j.plannedEnd,
      actualStart: j.actualStart,
      actualEnd: j.actualEnd,
      status: j.status,
    }));
  },
  async INCIDENTS(session, filters) {
    const incidents = await listIncidents(session, filters as Parameters<typeof listIncidents>[1]);
    return incidents.map((i) => ({
      code: i.code,
      title: i.title,
      vehiclePlate: i.vehicle.plate,
      driver: i.driver ? `${i.driver.lastName}, ${i.driver.firstName}` : "",
      category: i.category,
      urgency: i.urgency,
      status: i.status,
      occurredAt: i.occurredAt,
    }));
  },
  async ALERTS(session, filters) {
    const alerts = await listAlerts(session, filters as Parameters<typeof listAlerts>[1]);
    return alerts.map((a) => ({
      type: a.type,
      severity: a.severity,
      status: a.status,
      vehiclePlate: a.vehicle.plate,
      message: a.message,
      occurredAt: a.occurredAt,
    }));
  },
};

export async function fetchDatasetRows(
  dataset: ReportDatasetId,
  session: SessionUser,
  filters: Record<string, unknown>,
): Promise<Row[]> {
  return FETCHERS[dataset](session, filters);
}
