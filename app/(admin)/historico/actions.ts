"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { runFormAction } from "@/lib/actions";
import { inputToUtc } from "@/lib/format";
import { getOrCreatePositionsReportDefinition, queueReportRun } from "@/lib/data/reports";

// Descarga de lo que hay en pantalla. No genera el XLSX en el request: encola
// una corrida del dataset POSITIONS con los mismos filtros y lleva a la
// definición, donde la descarga arranca sola al terminar (ver RunWatcher). Así
// un rango grande no bloquea la web ni depende del tope del mapa: el archivo
// sale completo aunque el mapa haya recortado.
export async function exportHistoricoAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/historico" }, async () => {
    const vehicleId = (formData.get("vehicleId") as string) || undefined;
    const from = inputToUtc(formData.get("from") as string, (formData.get("fromTime") as string) || "00:00");
    const to = inputToUtc(formData.get("to") as string, (formData.get("toTime") as string) || "23:59");

    const definition = await getOrCreatePositionsReportDefinition(session);
    const run = await queueReportRun(session, definition.id, "XLSX", { vehicleId, from, to });
    return `/reportes/${definition.id}?run=${run.id}`;
  });
}
