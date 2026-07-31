// Consolida las alertas DEVICE_DISCONNECTED históricas: las que se emitieron
// mientras la deduplicación era por ventana de 15 minutos, una por cada corrida
// del motor. En la base del VPS son 1.133 alertas para 9 cortes reales.
//
// PROPUESTA — NO SE EJECUTA SOLO. Por defecto corre en seco e imprime lo que
// haría; hay que pasar `--aplicar` para que escriba. Antes de aplicarlo en el
// VPS hay que respaldar la base (ver CLAUDE.md).
//
//   npx tsx scripts/consolidar-alertas-desconexion.ts            # informe
//   npx tsx scripts/consolidar-alertas-desconexion.ts --aplicar  # escribe
//
// Solo toca el backlog viejo, y por eso se puede correr dos veces sin romper
// nada (ver yaEstaEnOrden). Sin ese filtro, una segunda pasada sobre la misma
// base hacía dos destrozos: concatenaba el texto de cierre sobre mensajes que
// ya lo tenían —"...420 alertas repetidas) — sin señal por al menos menos de
// 1 min (episodio reconstruido: 1 alertas repetidas)"— y, como al reescribir
// el mensaje las alertas ya consolidadas dejan de agrupar con su episodio,
// daba por terminado un corte que seguía vivo.
//
// Criterio de agrupación: mientras el equipo está caído su `lastSeenAt` no
// cambia, así que todas las alertas de un mismo episodio tienen exactamente el
// mismo texto. Se agrupa por vehículo + mensaje, y además se corta el grupo si
// entre dos alertas consecutivas pasó más de GAP_MINUTOS (por si dos episodios
// distintos llegaran a compartir texto).
//
// Qué hace con cada episodio:
//  - Sobrevive la primera alerta (la más cercana al inicio real del corte). Se
//    le reconstruye la duración con lo único que consta en la base: desde la
//    primera hasta la última alerta del episodio. Es un piso, no el valor
//    exacto — el corte siguió hasta que volvió la señal, que nadie registró.
//  - Las demás pasan a RESOLVED apuntando a la que sobrevive. No se borran:
//    tienen notificaciones colgando y borrarlas sería destruir historial.
//  - Si el episodio sigue vivo (su última alerta es de hace menos de
//    RECIENTE_MINUTOS), la que sobrevive queda ABIERTA y solo se le completa
//    `details.lastSeenAt`, para que el motor la cierre sola al reconectar.

import { prisma } from "@/lib/data/prisma";
import { AlertStatus, AlertType } from "@/lib/data/types";
import { fmtDateTime } from "@/lib/format";
import { fmtOutage } from "@/lib/validation/alert-rules";

const GAP_MINUTOS = 60;
const RECIENTE_MINUTOS = 60;

type AlertaFila = {
  id: string;
  vehicleId: string;
  message: string;
  occurredAt: Date;
  status: AlertStatus;
  details: unknown;
};

// Distingue el backlog a consolidar del resto. Es lo que hace que correr el
// script dos veces sea inofensivo, y se apoya en tres marcas de `details`:
//
//  - `consolidadoPor` / `consolidadaEn`: las escribió una corrida anterior de
//    este mismo script; ya están en orden.
//  - `lastSeenAt`: la emitió el motor nuevo, que deduplica por episodio y la
//    cierra sola al reconectar. Mismo criterio que lib/jobs/resolve-disconnection.
//
// Lo que no tiene ninguna de las tres es lo que dejó la deduplicación por
// ventana de 15 minutos, que es exactamente lo que este script viene a limpiar.
function yaEstaEnOrden(details: unknown): boolean {
  if (!details || typeof details !== "object" || Array.isArray(details)) return false;
  const d = details as Record<string, unknown>;
  return "consolidadoPor" in d || "consolidadaEn" in d || "lastSeenAt" in d;
}

function agruparEnEpisodios(alertas: AlertaFila[]): AlertaFila[][] {
  const porTexto = new Map<string, AlertaFila[]>();
  for (const a of alertas) {
    // Separador que no puede aparecer ni en un id ni en un mensaje, así dos
    // pares distintos no colisionan en la misma clave. Va escapado y no como
    // byte literal: crudo, git trata el archivo como binario y se pierde el
    // diff.
    const clave = `${a.vehicleId}\u0000${a.message}`;
    const grupo = porTexto.get(clave);
    if (grupo) grupo.push(a);
    else porTexto.set(clave, [a]);
  }

  const episodios: AlertaFila[][] = [];
  for (const grupo of porTexto.values()) {
    grupo.sort((x, y) => x.occurredAt.getTime() - y.occurredAt.getTime());
    let actual: AlertaFila[] = [grupo[0]];
    for (let i = 1; i < grupo.length; i++) {
      const anterior = grupo[i - 1];
      const salto = grupo[i].occurredAt.getTime() - anterior.occurredAt.getTime();
      if (salto > GAP_MINUTOS * 60_000) {
        episodios.push(actual);
        actual = [];
      }
      actual.push(grupo[i]);
    }
    episodios.push(actual);
  }
  return episodios.sort((a, b) => a[0].occurredAt.getTime() - b[0].occurredAt.getTime());
}

async function main() {
  const aplicar = process.argv.includes("--aplicar");
  const ahora = new Date();

  const todas = (await prisma.alert.findMany({
    where: { type: AlertType.DEVICE_DISCONNECTED },
    orderBy: { occurredAt: "asc" },
    select: { id: true, vehicleId: true, message: true, occurredAt: true, status: true, details: true },
  })) as AlertaFila[];

  // El filtro va acá y no en el where: son unos pocos miles de filas y la
  // condición es "que a details le falten estas claves", que en Prisma sobre
  // una columna Json sale mucho menos legible que leerlo en memoria.
  const alertas = todas.filter((a) => !yaEstaEnOrden(a.details));
  const enOrden = todas.length - alertas.length;

  if (alertas.length === 0) {
    console.log(
      `${todas.length} alertas DEVICE_DISCONNECTED, todas ya consolidadas o emitidas por el ` +
        `motor nuevo. No hay nada que hacer.`,
    );
    await prisma.$disconnect();
    return;
  }

  const placas = new Map<string, string>();
  for (const v of await prisma.vehicle.findMany({ select: { id: true, plate: true } })) {
    placas.set(v.id, v.plate);
  }

  const episodios = agruparEnEpisodios(alertas);
  console.log(
    `${alertas.length} alertas DEVICE_DISCONNECTED por consolidar → ${episodios.length} episodios` +
      (enOrden > 0 ? ` (${enOrden} ya estaban en orden y no se tocan)` : "") +
      (aplicar ? " — APLICANDO" : " — en seco, no se escribe nada"),
  );

  let cerradas = 0;
  let consolidadas = 0;
  let abiertasQueSiguen = 0;

  for (const episodio of episodios) {
    const primera = episodio[0];
    const ultima = episodio[episodio.length - 1];
    const sigueVivo = ahora.getTime() - ultima.occurredAt.getTime() < RECIENTE_MINUTOS * 60_000;
    const outageMs = ultima.occurredAt.getTime() - primera.occurredAt.getTime();
    const placa = placas.get(primera.vehicleId) ?? primera.vehicleId;

    console.log(
      `  ${placa}  ${fmtDateTime(primera.occurredAt)} → ${fmtDateTime(ultima.occurredAt)}  ` +
        `${episodio.length} alertas  corte ≥ ${fmtOutage(outageMs)}` +
        (sigueVivo ? "  [en curso: la primera queda abierta]" : ""),
    );

    const detallesBase = {
      // Lo mejor que consta: el motor no guardaba lastSeenAt en aquel momento.
      lastSeenAt: primera.occurredAt.toISOString(),
      consolidadoPor: "consolidar-alertas-desconexion",
      alertasDelEpisodio: episodio.length,
    };

    if (aplicar) {
      if (sigueVivo) {
        await prisma.alert.update({
          where: { id: primera.id },
          data: { details: detallesBase },
        });
        abiertasQueSiguen++;
      } else {
        await prisma.alert.update({
          where: { id: primera.id },
          data: {
            status: AlertStatus.RESOLVED,
            message: `${primera.message} — sin señal por al menos ${fmtOutage(outageMs)} (episodio reconstruido: ${episodio.length} alertas repetidas)`,
            details: { ...detallesBase, outageMs, outageLabel: fmtOutage(outageMs), resolvedBy: "consolidación" },
          },
        });
        cerradas++;
      }

      for (const repetida of episodio.slice(1)) {
        await prisma.alert.update({
          where: { id: repetida.id },
          data: {
            status: AlertStatus.RESOLVED,
            details: { consolidadaEn: primera.id, consolidadoPor: "consolidar-alertas-desconexion" },
          },
        });
        consolidadas++;
      }
    }
  }

  if (aplicar) {
    console.log(
      `Listo: ${cerradas} episodios cerrados, ${abiertasQueSiguen} en curso quedan abiertos, ` +
        `${consolidadas} alertas repetidas marcadas como resueltas.`,
    );
  } else {
    console.log("Nada escrito. Volvé a correrlo con --aplicar (con respaldo previo) para consolidar.");
  }

  await prisma.$disconnect();
}

void main();
