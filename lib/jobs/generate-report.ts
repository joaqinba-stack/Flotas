import { ReportFormat } from "@prisma/client";
import { systemBuildSessionUser } from "@/lib/data/users";
import {
  systemNextQueuedRuns,
  systemMarkRunning,
  systemMarkCompleted,
  systemMarkFailed,
} from "@/lib/data/reports";
import { fetchDatasetRows } from "@/lib/reports/datasets";
import { DATASET_COLUMNS, type ReportDatasetId } from "@/lib/reports/definitions";
import { renderPdf } from "@/lib/reports/pdf-export";
import { renderXlsx } from "@/lib/reports/xlsx-export";
import { renderCsv } from "@/lib/reports/csv-export";
import { saveReportFile } from "@/lib/storage";

const BATCH_SIZE = 5;

async function runOne(run: Awaited<ReturnType<typeof systemNextQueuedRuns>>[number]) {
  await systemMarkRunning(run.id);
  try {
    const session = await systemBuildSessionUser(run.requestedById);
    if (!session) throw new Error("El usuario que solicitó el reporte ya no está activo");

    const dataset = run.reportDefinition.dataset as ReportDatasetId;
    const allColumns = DATASET_COLUMNS[dataset];
    const selected = run.reportDefinition.columns as string[];
    const columns = allColumns.filter((c) => selected.includes(c.key));

    const rows = await fetchDatasetRows(dataset, session, run.filters as Record<string, unknown>);

    let buffer: Buffer;
    let extension: string;
    if (run.format === ReportFormat.PDF) {
      buffer = await renderPdf(run.reportDefinition.name, columns, rows);
      extension = "pdf";
    } else if (run.format === ReportFormat.XLSX) {
      buffer = await renderXlsx(run.reportDefinition.name, columns, rows);
      extension = "xlsx";
    } else {
      buffer = renderCsv(columns, rows);
      extension = "csv";
    }

    const storageKey = await saveReportFile(`runs/${run.id}`, `${run.reportDefinition.name}.${extension}`, buffer);
    await systemMarkCompleted(run.id, storageKey, rows.length);
  } catch (err) {
    await systemMarkFailed(run.id, err instanceof Error ? err.message : "Error desconocido");
  }
}

// Cola simple basada en polling (sin pg-boss/graphile-worker en este entorno):
// el worker llama esto en intervalo corto y procesa las corridas QUEUED.
export async function processQueuedReportRuns() {
  const pending = await systemNextQueuedRuns(BATCH_SIZE);
  for (const run of pending) {
    await runOne(run);
  }
}
