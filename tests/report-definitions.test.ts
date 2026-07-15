import { describe, it, expect } from "vitest";
import {
  validDatasetId,
  validateColumns,
  parseDatasetFilters,
} from "@/lib/reports/definitions";
import { ValidationError } from "@/lib/errors";

describe("validDatasetId", () => {
  it("acepta datasets conocidos y rechaza el resto", () => {
    expect(validDatasetId("VEHICLES")).toBe(true);
    expect(validDatasetId("UNKNOWN")).toBe(false);
  });
});

describe("validateColumns", () => {
  it("acepta columnas válidas del dataset", () => {
    expect(validateColumns("VEHICLES", ["plate", "status"])).toEqual(["plate", "status"]);
  });

  it("rechaza columnas fuera del dataset", () => {
    expect(() => validateColumns("VEHICLES", ["plate", "notAColumn"])).toThrow(ValidationError);
  });
});

describe("parseDatasetFilters", () => {
  it("valida filtros propios del dataset", () => {
    expect(parseDatasetFilters("VEHICLES", { status: "ACTIVE" })).toEqual({ status: "ACTIVE" });
  });

  it("rechaza un valor de enum inválido", () => {
    expect(() => parseDatasetFilters("VEHICLES", { status: "NOPE" })).toThrow();
  });

  it("acepta filtros vacíos", () => {
    expect(parseDatasetFilters("JORNADAS", {})).toEqual({});
  });
});
