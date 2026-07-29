const TIME_ZONE = process.env.NEXT_PUBLIC_DISPLAY_TZ ?? "America/Asuncion";
const LOCALE = "es-PY";
const CURRENCY = "PYG";

export function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(d));
}

// Con segundos: en el rastreo dos posiciones consecutivas suelen caer dentro
// del mismo minuto, y sin segundos se leen como si fueran la misma.
export function fmtDateTimeSeconds(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: TIME_ZONE,
  }).format(new Date(d));
}

export function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat(LOCALE, { dateStyle: "short", timeZone: TIME_ZONE }).format(
    new Date(d),
  );
}

export function fmtNumber(n: number | string | null | undefined, digits = 0): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(n));
}

export function fmtMoney(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "—";
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY }).format(Number(n));
}

// Desfasaje de la zona de visualización para ese instante, en ms.
function zoneOffsetMs(instant: Date): number {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TIME_ZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const val = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  const comoSiFueraUtc = Date.UTC(
    val("year"),
    val("month") - 1,
    val("day"),
    val("hour") % 24, // algunos runtimes devuelven 24 en vez de 0
    val("minute"),
    val("second"),
  );
  return comoSiFueraUtc - instant.getTime();
}

// Convierte lo que el usuario escribe en los filtros (input date + input time)
// al instante UTC que le corresponde, interpretándolo en hora de Paraguay.
// Sin esto el servidor —que en el VPS corre en UTC— leería "08:00" como 08:00
// UTC, o sea las 05:00 de Paraguay, y el rango quedaría corrido tres horas.
export function inputToUtc(dateStr: string, timeStr: string): Date {
  const comoUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  if (Number.isNaN(comoUtc.getTime())) return comoUtc;
  return new Date(comoUtc.getTime() - zoneOffsetMs(comoUtc));
}

// El día de hoy según la zona de visualización, no la del servidor: en el VPS
// (UTC), pasadas las 21:00 de Paraguay toISOString ya devuelve el día siguiente.
export function dayInputValue(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function dateInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function datetimeInputValue(d: Date | string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}
