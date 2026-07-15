import { z } from "zod";
import {
  FuelType,
  VehicleStatus,
  DriverStatus,
  OrgUnitKind,
  TireMovementType,
  AuxAssetMovementType,
  PerformanceKind,
  IncidentUrgency,
  IncidentStatus,
  ServiceOrderStatus,
  AlertStatus,
  ReportFormat,
  DeskChannel,
  DeskTicketStatus,
} from "@/lib/data/types";

const emptyToNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const optionalString = z.preprocess(emptyToNull, z.string().trim().nullable());
export const optionalNumber = z.preprocess(emptyToNull, z.coerce.number().nullable());

export const vehicleInputSchema = z.object({
  plate: z.string().trim().min(3).max(12).transform((s) => s.toUpperCase()),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1980).max(2100),
  type: z.string().trim().min(1),
  fuelType: z.nativeEnum(FuelType),
  tankCapacityLiters: optionalNumber.pipe(z.number().positive().max(2000).nullable()),
  odometerKm: z.coerce.number().int().min(0),
  orgUnitId: z.string().min(1),
});

export const vehicleStatusChangeSchema = z.object({
  toStatus: z.nativeEnum(VehicleStatus),
  reason: optionalString,
});

export const assignDriverSchema = z.object({
  driverId: z.preprocess(emptyToNull, z.string().nullable()),
});

export const driverInputSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  documentId: z.string().trim().min(5),
  licenseNumber: z.string().trim().min(1),
  licenseCategory: z.string().trim().min(1),
  licenseExpiry: z.coerce.date(),
  phone: optionalString,
  status: z.nativeEnum(DriverStatus),
  orgUnitId: z.string().min(1),
});

export const driverLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const orgUnitInputSchema = z.object({
  name: z.string().trim().min(1),
  kind: z.nativeEnum(OrgUnitKind),
  parentId: z.preprocess(emptyToNull, z.string().nullable()),
});

export const deviceInputSchema = z.object({
  uniqueId: z.string().trim().min(4),
  name: z.string().trim().min(1),
  monitoringIntervalSeconds: z.coerce.number().int().min(10).max(3600),
});

export const fuelLoadInputSchema = z.object({
  vehicleId: z.string().min(1),
  jornadaId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  loadedAt: z.coerce.date(),
  liters: z.coerce.number().positive().max(5000),
  pricePerLiter: optionalNumber.pipe(z.number().positive().nullable()),
  odometerKm: z.coerce.number().int().min(0),
  station: optionalString,
  fuelType: z.nativeEnum(FuelType),
});

export const fuelReviewSchema = z.object({
  decision: z.enum(["VALID", "REJECTED"]),
  note: optionalString,
});

export const tireInputSchema = z.object({
  serialNumber: z.string().trim().min(3),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  size: z.string().trim().min(1),
  treadDepthMm: optionalNumber.pipe(z.number().positive().max(50).nullable()),
});

export const tireMovementSchema = z.object({
  type: z.nativeEnum(TireMovementType),
  vehicleId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  toPosition: optionalString,
  odometerKm: optionalNumber.pipe(z.number().int().min(0).nullable()),
  treadDepthMm: optionalNumber.pipe(z.number().positive().max(50).nullable()),
  notes: optionalString,
});

export const auxAssetInputSchema = z.object({
  code: z.string().trim().min(2),
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
});

export const auxAssetMovementSchema = z.object({
  type: z.nativeEnum(AuxAssetMovementType),
  vehicleId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  notes: optionalString,
});

export const jornadaInputSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().min(1),
  purpose: z.string().trim().min(3),
  plannedStart: z.coerce.date(),
  plannedEnd: z.coerce.date(),
  notes: optionalString,
});

export const odometerSchema = z.object({
  odometerKm: optionalNumber.pipe(z.number().int().min(0).nullable()),
});

export const viaticoInputSchema = z.object({
  concept: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
});

export const permitInputSchema = z.object({
  type: z.string().trim().min(2),
  description: z.string().trim().min(2),
});

export const novedadInputSchema = z.object({
  category: z.string().trim().min(2),
  description: z.string().trim().min(2),
  occurredAt: z.coerce.date(),
});

export const supplierInputSchema = z.object({
  name: z.string().trim().min(2),
  taxId: z.string().trim().min(5),
  serviceTypes: z.string().trim().min(2),
  contactName: optionalString,
  contactEmail: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().email().nullable()),
  contactPhone: optionalString,
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const supplierLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
});

export const incidentInputSchema = z.object({
  vehicleId: z.string().min(1),
  jornadaId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  title: z.string().trim().min(3),
  description: z.string().trim().min(3),
  category: z.string().trim().min(2),
  urgency: z.nativeEnum(IncidentUrgency),
  occurredAt: z.coerce.date(),
});

export const incidentClassifySchema = z.object({
  urgency: z.nativeEnum(IncidentUrgency).optional(),
  category: z.string().trim().min(2).optional(),
  status: z.nativeEnum(IncidentStatus).optional(),
});

export const noteSchema = z.object({
  body: z.string().trim().min(1),
});

export const serviceOrderInputSchema = z.object({
  supplierId: z.string().min(1),
  vehicleId: z.string().min(1),
  incidentId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  title: z.string().trim().min(3),
  description: z.string().trim().min(3),
  costEstimate: optionalNumber.pipe(z.number().positive().nullable()),
  scheduledFor: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.coerce.date().nullable()),
});

export const serviceOrderStatusSchema = z.object({
  toStatus: z.nativeEnum(ServiceOrderStatus),
  costFinal: optionalNumber.pipe(z.number().min(0).nullable()),
});

export const performanceRecordSchema = z.object({
  kind: z.nativeEnum(PerformanceKind),
  summary: z.string().trim().min(3),
  details: optionalString,
  jornadaId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
});

const latLngSchema = z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)]);

export const geofencePolygonSchema = z.array(latLngSchema).min(3, "El polígono necesita al menos 3 vértices");

export const geofenceInputSchema = z.object({
  name: z.string().trim().min(2),
  description: optionalString,
  polygon: z.preprocess((v) => (typeof v === "string" ? JSON.parse(v) : v), geofencePolygonSchema),
  orgUnitId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
  active: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
});

export const alertAcknowledgeSchema = z.object({
  status: z.nativeEnum(AlertStatus),
});

export const reportDefinitionInputSchema = z.object({
  name: z.string().trim().min(3),
  description: optionalString,
  dataset: z.string().min(1),
  columns: z.preprocess(
    (v) => (typeof v === "string" ? [v] : v),
    z.array(z.string()).min(1, "Seleccione al menos una columna"),
  ),
  filters: z.preprocess((v) => (typeof v === "string" ? JSON.parse(v || "{}") : (v ?? {})), z.record(z.unknown())),
});

export const reportRunInputSchema = z.object({
  format: z.nativeEnum(ReportFormat),
  filterOverrides: z.preprocess(
    (v) => (typeof v === "string" ? JSON.parse(v || "{}") : (v ?? {})),
    z.record(z.unknown()),
  ),
});

const emptyToNullId = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);

export const deskTicketInputSchema = z.object({
  channel: z.nativeEnum(DeskChannel),
  subject: z.string().trim().min(3),
  description: z.string().trim().min(3),
  priority: z.nativeEnum(IncidentUrgency),
  requesterName: z.string().trim().min(2),
  requesterContact: optionalString,
  vehicleId: z.preprocess(emptyToNullId, z.string().nullable()),
  linkedIncidentId: z.preprocess(emptyToNullId, z.string().nullable()),
  linkedJornadaId: z.preprocess(emptyToNullId, z.string().nullable()),
});

export const deskTicketStatusSchema = z.object({
  toStatus: z.nativeEnum(DeskTicketStatus),
});

export const deskTicketAssignSchema = z.object({
  assignedToId: z.preprocess(emptyToNullId, z.string().nullable()),
});
