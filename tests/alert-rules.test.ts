import { describe, it, expect } from "vitest";
import {
  isSpeeding,
  isDeviceDisconnected,
  isUnauthorizedMovement,
  geofenceTransition,
} from "@/lib/validation/alert-rules";
import { pointInPolygon } from "@/lib/validation/geofence-geometry";

describe("isSpeeding", () => {
  it("marca exceso sobre el límite", () => {
    expect(isSpeeding(130, 120)).toBe(true);
    expect(isSpeeding(120, 120)).toBe(false);
    expect(isSpeeding(90, 120)).toBe(false);
  });
});

describe("isDeviceDisconnected", () => {
  const now = new Date("2026-07-15T12:00:00Z");

  it("nunca visto es desconectado", () => {
    expect(isDeviceDisconnected(null, 60, now)).toBe(true);
  });

  it("dentro del margen de tolerancia no está desconectado", () => {
    const lastSeen = new Date(now.getTime() - 60_000);
    expect(isDeviceDisconnected(lastSeen, 60, now)).toBe(false);
  });

  it("supera el margen (3x intervalo) y se marca desconectado", () => {
    const lastSeen = new Date(now.getTime() - 4 * 60_000);
    expect(isDeviceDisconnected(lastSeen, 60, now)).toBe(true);
  });
});

describe("isUnauthorizedMovement", () => {
  it("con jornada activa nunca es no autorizado", () => {
    expect(isUnauthorizedMovement({ speedKmh: 50, ignition: true, hasActiveJornada: true })).toBe(false);
  });

  it("ignición encendida sin jornada es no autorizado", () => {
    expect(isUnauthorizedMovement({ speedKmh: 0, ignition: true, hasActiveJornada: false })).toBe(true);
  });

  it("sin dato de ignición, usa velocidad como proxy", () => {
    expect(isUnauthorizedMovement({ speedKmh: 10, ignition: null, hasActiveJornada: false })).toBe(true);
    expect(isUnauthorizedMovement({ speedKmh: 2, ignition: null, hasActiveJornada: false })).toBe(false);
  });

  it("ignición apagada explícita no dispara aunque haya velocidad residual (GPS drift)", () => {
    expect(isUnauthorizedMovement({ speedKmh: 10, ignition: false, hasActiveJornada: false })).toBe(false);
  });
});

describe("geofenceTransition", () => {
  it("detecta ingreso y salida", () => {
    expect(geofenceTransition(false, true)).toBe("ENTER");
    expect(geofenceTransition(true, false)).toBe("EXIT");
    expect(geofenceTransition(true, true)).toBe(null);
    expect(geofenceTransition(false, false)).toBe(null);
  });
});

describe("pointInPolygon", () => {
  const square: Array<[number, number]> = [
    [-34.60, -58.39],
    [-34.60, -58.37],
    [-34.62, -58.37],
    [-34.62, -58.39],
  ];

  it("detecta un punto dentro del polígono", () => {
    expect(pointInPolygon([-34.61, -58.38], square)).toBe(true);
  });

  it("detecta un punto fuera del polígono", () => {
    expect(pointInPolygon([-34.50, -58.30], square)).toBe(false);
  });
});
