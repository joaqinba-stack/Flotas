import { z } from "zod";
import {
  FuelType,
  VehicleStatus,
  DriverStatus,
  OrgUnitKind,
  TireMovementType,
  AuxAssetMovementType,
  PerformanceKind,
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

export const performanceRecordSchema = z.object({
  kind: z.nativeEnum(PerformanceKind),
  summary: z.string().trim().min(3),
  details: optionalString,
  jornadaId: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().nullable()),
});
