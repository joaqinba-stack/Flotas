import { describe, it, expect } from "vitest";
import {
  isSpeeding,
  isDeviceDisconnected,
  isUnauthorizedMovement,
  geofenceTransition,
  isPersistentAlertType,
  fmtOutage,
  buildReconnectionOutcome,
} from "@/lib/validation/alert-rules";
import { pointInPolygon } from "@/lib/validation/geofence-geometry";
import { AlertType } from "@/lib/data/types";

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

describe("isPersistentAlertType", () => {
  it("la desconexión persiste: se deduplica por episodio, no por ventana", () => {
    expect(isPersistentAlertType(AlertType.DEVICE_DISCONNECTED)).toBe(true);
  });

  it("los hechos puntuales siguen deduplicándose por ventana", () => {
    expect(isPersistentAlertType(AlertType.SPEEDING)).toBe(false);
    expect(isPersistentAlertType(AlertType.GEOFENCE_ENTER)).toBe(false);
    expect(isPersistentAlertType(AlertType.GEOFENCE_EXIT)).toBe(false);
    expect(isPersistentAlertType(AlertType.UNAUTHORIZED_MOVEMENT)).toBe(false);
  });
});

describe("fmtOutage", () => {
  const min = 60_000;

  it("por debajo del minuto no inventa precisión", () => {
    expect(fmtOutage(0)).toBe("menos de 1 min");
    expect(fmtOutage(30_000)).toBe("menos de 1 min");
  });

  it("minutos y horas", () => {
    expect(fmtOutage(45 * min)).toBe("45 min");
    expect(fmtOutage(3 * 60 * min + 12 * min)).toBe("3 h 12 min");
  });

  it("a partir del día muestra días y horas, no horas acumuladas", () => {
    // El corte de AMINCITO: cuatro días largos. En horas sueltas no se lee.
    expect(fmtOutage(4 * 1440 * min + 6 * 60 * min)).toBe("4 d 6 h");
  });
});

describe("buildReconnectionOutcome", () => {
  const startedAt = new Date("2026-07-20T10:00:00Z");

  it("deja la duración del corte en el mensaje y en crudo para details", () => {
    const r = buildReconnectionOutcome({
      message: "Dispositivo ROQUE sin señal desde 20/7/26, 06:00",
      startedAt,
      reconnectedAt: new Date("2026-07-24T16:00:00Z"),
    });
    expect(r.outageMs).toBe(4 * 24 * 3600_000 + 6 * 3600_000);
    expect(r.outageLabel).toBe("4 d 6 h");
    expect(r.message).toContain("Dispositivo ROQUE sin señal desde");
    expect(r.message).toContain("tras 4 d 6 h sin señal");
  });

  it("un reloj corrido no produce un corte de duración negativa", () => {
    const r = buildReconnectionOutcome({
      message: "Dispositivo X sin señal",
      startedAt,
      reconnectedAt: new Date(startedAt.getTime() - 5 * 60_000),
    });
    expect(r.outageMs).toBe(0);
    expect(r.outageLabel).toBe("menos de 1 min");
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
