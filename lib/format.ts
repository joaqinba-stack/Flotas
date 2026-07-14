const TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TZ ?? "America/Argentina/Buenos_Aires";

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(d));
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeZone: TIME_ZONE }).format(
    new Date(d),
  );
}

export function fmtNumber(n: number | string | null | undefined, digits = 0): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n));
}

export function fmtMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(n));
}

export function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function datetimeInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}
