import { describe, it, expect } from "vitest";
import {
  validateFuelLoad,
  FUEL_FLAGS,
  type FuelValidationContext,
} from "@/lib/validation/fuel-load-rules";

const NOW = new Date("2026-07-14T12:00:00Z");

function ctx(overrides: Partial<FuelValidationContext> = {}): FuelValidationContext {
  return {
    tankCapacityLiters: 80,
    vehicleFuelType: "DIESEL",
    previousLoads: [],
    ...overrides,
  };
}

describe("validateFuelLoad", () => {
  it("carga normal sin historial es VALID", () => {
    const r = validateFuelLoad(
      { liters: 50, odometerKm: 10000, loadedAt: new Date("2026-07-14T10:00:00Z"), fuelType: "DIESEL" },
      ctx(),
      undefined,
      NOW,
    );
    expect(r.status).toBe("VALID");
    expect(r.flags).toEqual([]);
  });

  it("detecta exceso sobre capacidad de tanque", () => {
    const r = validateFuelLoad(
      { liters: 95, odometerKm: 10000, loadedAt: new Date("2026-07-14T10:00:00Z"), fuelType: "DIESEL" },
      ctx(),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.EXCEEDS_TANK_CAPACITY);
    expect(r.status).toBe("FLAGGED");
  });

  it("sin capacidad conocida no marca exceso", () => {
    const r = validateFuelLoad(
      { liters: 500, odometerKm: 10000, loadedAt: new Date("2026-07-14T10:00:00Z"), fuelType: "DIESEL" },
      ctx({ tankCapacityLiters: null }),
      undefined,
      NOW,
    );
    expect(r.flags).not.toContain(FUEL_FLAGS.EXCEEDS_TANK_CAPACITY);
  });

  it("detecta duplicado en ventana corta", () => {
    const r = validateFuelLoad(
      { liters: 40, odometerKm: 10010, loadedAt: new Date("2026-07-14T10:20:00Z"), fuelType: "DIESEL" },
      ctx({ previousLoads: [{ loadedAt: new Date("2026-07-14T10:00:00Z"), liters: 42, odometerKm: 10005 }] }),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.DUPLICATE_SUSPECT);
  });

  it("detecta misma cantidad en ventana de 2h (fuera de la ventana de duplicado)", () => {
    const r = validateFuelLoad(
      { liters: 42.3, odometerKm: 10100, loadedAt: new Date("2026-07-14T11:30:00Z"), fuelType: "DIESEL" },
      ctx({ previousLoads: [{ loadedAt: new Date("2026-07-14T10:00:00Z"), liters: 42, odometerKm: 10005 }] }),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.SAME_AMOUNT_RECENT);
    expect(r.flags).not.toContain(FUEL_FLAGS.DUPLICATE_SUSPECT);
  });

  it("detecta regresión de odómetro", () => {
    const r = validateFuelLoad(
      { liters: 30, odometerKm: 9000, loadedAt: new Date("2026-07-14T10:00:00Z"), fuelType: "DIESEL" },
      ctx({ previousLoads: [{ loadedAt: new Date("2026-07-10T10:00:00Z"), liters: 42, odometerKm: 10005 }] }),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.ODOMETER_REGRESSION);
  });

  it("detecta salto de odómetro anómalo", () => {
    const r = validateFuelLoad(
      { liters: 30, odometerKm: 20000, loadedAt: new Date("2026-07-14T10:00:00Z"), fuelType: "DIESEL" },
      ctx({ previousLoads: [{ loadedAt: new Date("2026-07-10T10:00:00Z"), liters: 42, odometerKm: 10000 }] }),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.ODOMETER_JUMP);
  });

  it("detecta carga demasiado próxima (tiempo y km)", () => {
    const r = validateFuelLoad(
      { liters: 15, odometerKm: 10010, loadedAt: new Date("2026-07-14T11:00:00Z"), fuelType: "DIESEL" },
      ctx({ previousLoads: [{ loadedAt: new Date("2026-07-14T09:30:00Z"), liters: 42, odometerKm: 10000 }] }),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.TOO_SOON_AFTER_PREVIOUS);
  });

  it("detecta tipo de combustible incorrecto y fecha futura", () => {
    const r = validateFuelLoad(
      { liters: 30, odometerKm: 10100, loadedAt: new Date("2026-07-15T10:00:00Z"), fuelType: "NAFTA" },
      ctx(),
      undefined,
      NOW,
    );
    expect(r.flags).toContain(FUEL_FLAGS.FUEL_TYPE_MISMATCH);
    expect(r.flags).toContain(FUEL_FLAGS.FUTURE_DATE);
  });
});
