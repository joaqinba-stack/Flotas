import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma, wipe, buildFixture } from "./helpers";
import { listVehicles, getVehicle } from "@/lib/data/vehicles";
import { listDrivers, getDriver } from "@/lib/data/drivers";
import { listServiceOrders, getServiceOrder } from "@/lib/data/supplier-orders";
import { ForbiddenError, NotFoundError } from "@/lib/errors";

// Verificación crítica del pliego (PLAN §6): un DRIVER o SUPPLIER no puede
// acceder a datos fuera de su alcance por la capa de datos, y un SUPERVISOR
// solo ve su subárbol del organigrama. Estos tests golpean lib/data con la
// sesión de cada rol, no la UI.
let fx: Awaited<ReturnType<typeof buildFixture>>;

beforeAll(async () => {
  await wipe();
  fx = await buildFixture();
});

afterAll(async () => {
  await wipe();
  await prisma.$disconnect();
});

describe("scoping de vehículos", () => {
  it("ADMIN ve vehículos de todas las bases", async () => {
    const list = await listVehicles(fx.sessions.admin);
    const plates = list.map((v) => v.plate);
    expect(plates).toContain(fx.ids.vehNorte.plate);
    expect(plates).toContain(fx.ids.vehSur.plate);
  });

  it("SUPERVISOR del Departamento ve ambas bases hijas", async () => {
    const list = await listVehicles(fx.sessions.supervisorDep);
    const plates = list.map((v) => v.plate);
    expect(plates).toContain(fx.ids.vehNorte.plate);
    expect(plates).toContain(fx.ids.vehSur.plate);
  });

  it("SUPERVISOR de la Base Norte NO ve vehículos de la Sur", async () => {
    const list = await listVehicles(fx.sessions.supervisorNorte);
    const plates = list.map((v) => v.plate);
    expect(plates).toContain(fx.ids.vehNorte.plate);
    expect(plates).not.toContain(fx.ids.vehSur.plate);
  });

  it("SUPERVISOR de la Base Norte recibe 404 al pedir un vehículo de la Sur por id directo", async () => {
    await expect(getVehicle(fx.sessions.supervisorNorte, fx.ids.vehSur.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("DRIVER solo ve el vehículo asignado a sí mismo", async () => {
    const list = await listVehicles(fx.sessions.driver);
    expect(list).toHaveLength(1);
    expect(list[0].plate).toBe(fx.ids.vehNorte.plate);
  });

  it("DRIVER no puede acceder por id a un vehículo que no es el suyo", async () => {
    await expect(getVehicle(fx.sessions.driver, fx.ids.vehSur.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("SUPPLIER no tiene acceso por organigrama a vehículos", async () => {
    await expect(listVehicles(fx.sessions.supplierA)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("SUPERVISOR sin unidad organizacional no abre todo: se le niega el acceso", async () => {
    await expect(listVehicles(fx.sessions.supervisorSinOrg)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("scoping de conductores", () => {
  it("SUPERVISOR de la Base Norte NO ve conductores de la Sur", async () => {
    const list = await listDrivers(fx.sessions.supervisorNorte);
    const ids = list.map((d) => d.id);
    expect(ids).toContain(fx.ids.driverNorte.id);
    expect(ids).not.toContain(fx.ids.driverSur.id);
  });

  it("DRIVER solo se ve a sí mismo", async () => {
    const list = await listDrivers(fx.sessions.driver);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(fx.ids.driverNorte.id);
  });

  it("DRIVER no puede acceder al legajo de otro conductor", async () => {
    await expect(getDriver(fx.sessions.driver, fx.ids.driverSur.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("SUPPLIER no accede a conductores", async () => {
    await expect(listDrivers(fx.sessions.supplierA)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe("scoping de órdenes de servicio (proveedores)", () => {
  it("SUPPLIER A solo ve sus propias órdenes, nunca las del proveedor B", async () => {
    const list = await listServiceOrders(fx.sessions.supplierA);
    const ids = list.map((o) => o.id);
    expect(ids).toContain(fx.ids.orderA.id);
    expect(ids).not.toContain(fx.ids.orderB.id);
  });

  it("SUPPLIER A recibe 404 al pedir por id una orden del proveedor B", async () => {
    await expect(getServiceOrder(fx.sessions.supplierA, fx.ids.orderB.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("DRIVER no tiene acceso a órdenes de servicio", async () => {
    await expect(listServiceOrders(fx.sessions.driver)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("SUPERVISOR de la Base Norte ve la orden de un vehículo suyo pero no la de la Sur", async () => {
    const list = await listServiceOrders(fx.sessions.supervisorNorte);
    const ids = list.map((o) => o.id);
    expect(ids).toContain(fx.ids.orderA.id);
    expect(ids).not.toContain(fx.ids.orderB.id);
  });
});
