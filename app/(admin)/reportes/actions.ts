"use server";

import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { formDataToObject, runFormAction } from "@/lib/actions";
import { reportDefinitionInputSchema, reportRunInputSchema } from "@/lib/validation/inputs";
import { createReportDefinition, queueReportRun, getOrCreatePositionsReportDefinition } from "@/lib/data/reports";

export async function createReportDefinitionAction(formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/reportes/nuevo", revalidate: ["/reportes"] }, async () => {
    const raw = formDataToObject(formData);
    const input = reportDefinitionInputSchema.parse({
      ...raw,
      columns: formData.getAll("columns"),
      filters: raw.filters || "{}",
    });
    const definition = await createReportDefinition(session, input);
    return `/reportes/${definition.id}`;
  });
}

// Botón de "un solo click" en /reportes: encola una corrida XLSX con todo el
// historial de ubicaciones del alcance del viewer y lleva a la definición
// canónica, donde el link de descarga aparece apenas el worker la termine.
export async function quickExportAllPositionsAction() {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction({ errorPath: "/reportes" }, async () => {
    const definition = await getOrCreatePositionsReportDefinition(session);
    await queueReportRun(session, definition.id, "XLSX", {});
    return `/reportes/${definition.id}`;
  });
}

export async function queueReportRunAction(definitionId: string, formData: FormData) {
  const session = await requireSession(Role.SUPERVISOR);
  return runFormAction(
    { errorPath: `/reportes/${definitionId}`, revalidate: [`/reportes/${definitionId}`] },
    async () => {
      const raw = formDataToObject(formData);
      const input = reportRunInputSchema.parse({ ...raw, filterOverrides: raw.filterOverrides || "{}" });
      await queueReportRun(session, definitionId, input.format, input.filterOverrides);
      return `/reportes/${definitionId}`;
    },
  );
}
