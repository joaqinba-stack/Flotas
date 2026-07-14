import { z } from "zod";
import { FuelType, VehicleStatus, DriverStatus, OrgUnitKind } from "@/lib/data/types";

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
