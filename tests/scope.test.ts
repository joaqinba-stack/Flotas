import { describe, it, expect } from "vitest";
import { buildOrgScopeWhere, assertPathInScope } from "@/lib/auth/scope";
import type { SessionUser } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { ForbiddenError } from "@/lib/errors";

function session(overrides: Partial<SessionUser>): SessionUser {
  return {
    userId: "u1",
    email: "x@x",
    name: "X",
    role: Role.ADMIN,
    orgUnitId: null,
    orgPath: null,
    driverId: null,
    supplierId: null,
    ...overrides,
  };
}

describe("buildOrgScopeWhere", () => {
  it("ADMIN no recibe filtro", () => {
    expect(buildOrgScopeWhere(session({ role: Role.ADMIN }))).toEqual({});
  });

  it("SUPERVISOR filtra por prefijo de su path", () => {
    const s = session({ role: Role.SUPERVISOR, orgUnitId: "o2", orgPath: "/root/o2/" });
    expect(buildOrgScopeWhere(s)).toEqual({
      orgUnit: { path: { startsWith: "/root/o2/" } },
    });
  });

  it("DESK_AGENT filtra por prefijo de su path con relación custom", () => {
    const s = session({ role: Role.DESK_AGENT, orgUnitId: "o1", orgPath: "/root/" });
    expect(buildOrgScopeWhere(s, "vehicleOrgUnit")).toEqual({
      vehicleOrgUnit: { path: { startsWith: "/root/" } },
    });
  });

  it("SUPERVISOR sin orgPath es rechazado", () => {
    const s = session({ role: Role.SUPERVISOR, orgPath: null });
    expect(() => buildOrgScopeWhere(s)).toThrow(ForbiddenError);
  });

  it("DRIVER y SUPPLIER nunca reciben scope por organigrama", () => {
    expect(() => buildOrgScopeWhere(session({ role: Role.DRIVER, orgPath: "/root/" }))).toThrow(
      ForbiddenError,
    );
    expect(() => buildOrgScopeWhere(session({ role: Role.SUPPLIER }))).toThrow(ForbiddenError);
  });
});

describe("assertPathInScope", () => {
  it("ADMIN pasa siempre", () => {
    expect(() => assertPathInScope(session({ role: Role.ADMIN }), "/a/b/")).not.toThrow();
  });

  it("SUPERVISOR pasa dentro de su subárbol y falla fuera", () => {
    const s = session({ role: Role.SUPERVISOR, orgPath: "/root/ops/" });
    expect(() => assertPathInScope(s, "/root/ops/norte/")).not.toThrow();
    expect(() => assertPathInScope(s, "/root/mantenimiento/")).toThrow(ForbiddenError);
    // Un path hermano que comparte prefijo textual pero no jerárquico no debe pasar
    expect(() => assertPathInScope(s, "/root/ops2/")).toThrow(ForbiddenError);
  });

  it("DRIVER nunca pasa por organigrama", () => {
    const s = session({ role: Role.DRIVER, orgPath: "/root/" });
    expect(() => assertPathInScope(s, "/root/x/")).toThrow(ForbiddenError);
  });
});
