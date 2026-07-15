import type { ColumnDef } from "./definitions";

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function renderCsv(columns: ColumnDef[], rows: Array<Record<string, unknown>>): Buffer {
  const header = columns.map((c) => escapeCsv(c.label)).join(",");
  const lines = rows.map((row) => columns.map((c) => escapeCsv(row[c.key])).join(","));
  return Buffer.from([header, ...lines].join("\n"), "utf-8");
}
