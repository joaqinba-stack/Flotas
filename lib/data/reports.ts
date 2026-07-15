import { Prisma, Role, ReportFormat, ReportRunStatus } from "@prisma/client";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import {
  validDatasetId,
  validateColumns,
  parseDatasetFilters,
  type ReportDatasetId,
} from "@/lib/reports/definitions";
import { readReportFile } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";

function requireManager(session: SessionUser) {
  if (session.role !== Role.ADMIN && session.role !== Role.SUPERVISOR) {
    throw new ForbiddenError();
  }
}

export type ReportDefinitionInput = {
  name: string;
  description: string | null;
  dataset: string;
  columns: string[];
  filters: Record<string, unknown>;
};

// El catálogo de definiciones es compartido entre ADMIN/SUPERVISOR: la
// definición solo describe columnas/filtros, no datos. El alcance real se
// aplica siempre en la corrida (ReportRun), con la sesión de quien la pide.
export async function listReportDefinitions(session: SessionUser) {
  requireManager(session);
  return prisma.reportDefinition.findMany({
    orderBy: { name: "asc" },
    include: { createdBy: { select: { name: true } }, _count: { select: { runs: true } } },
  });
}

export async function getReportDefinition(session: SessionUser, id: string) {
  requireManager(session);
  const definition = await prisma.reportDefinition.findUnique({ where: { id } });
  if (!definition) throw new NotFoundError("Definición de reporte no encontrada");
  return definition;
}

function normalizeDataset(dataset: string): ReportDatasetId {
  if (!validDatasetId(dataset)) throw new ValidationError(`Dataset inválido: ${dataset}`);
  return dataset;
}

export async function createReportDefinition(session: SessionUser, input: ReportDefinitionInput) {
  requireManager(session);
  const dataset = normalizeDataset(input.dataset);
  validateColumns(dataset, input.columns);
  parseDatasetFilters(dataset, input.filters);
  return prisma.reportDefinition.create({
    data: {
      name: input.name,
      description: input.description,
      dataset,
      columns: input.columns,
      filters: input.filters as Prisma.InputJsonValue,
      createdById: session.userId,
    },
  });
}

export async function listReportRuns(session: SessionUser, definitionId?: string) {
  requireManager(session);
  return prisma.reportRun.findMany({
    where: definitionId ? { reportDefinitionId: definitionId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reportDefinition: { select: { name: true, dataset: true } },
      requestedBy: { select: { name: true } },
    },
  });
}

export async function getReportRun(session: SessionUser, id: string) {
  requireManager(session);
  const run = await prisma.reportRun.findUnique({
    where: { id },
    include: { reportDefinition: true, requestedBy: { select: { name: true } } },
  });
  if (!run) throw new NotFoundError("Corrida de reporte no encontrada");
  return run;
}

// Solo encola: lib/jobs/generate-report.ts (worker) procesa la corrida con la
// sesión reconstruida de requestedById en el momento de ejecutar, nunca con
// privilegios del proceso worker.
export async function queueReportRun(
  session: SessionUser,
  definitionId: string,
  format: ReportFormat,
  filterOverrides: Record<string, unknown>,
) {
  requireManager(session);
  const definition = await getReportDefinition(session, definitionId);
  const dataset = normalizeDataset(definition.dataset);
  const mergedFilters = { ...(definition.filters as Record<string, unknown>), ...filterOverrides };
  parseDatasetFilters(dataset, mergedFilters);
  return prisma.reportRun.create({
    data: {
      reportDefinitionId: definitionId,
      format,
      filters: mergedFilters as Prisma.InputJsonValue,
      requestedById: session.userId,
    },
  });
}

export async function downloadReportRun(session: SessionUser, id: string) {
  const run = await getReportRun(session, id);
  if (run.status !== ReportRunStatus.COMPLETED || !run.resultStorageKey) {
    throw new ValidationError("El reporte todavía no terminó de generarse");
  }
  return { run, data: await readReportFile(run.resultStorageKey) };
}

// --- Funciones de sistema (worker, sin sesión de usuario) ---

export async function systemNextQueuedRuns(limit: number) {
  return prisma.reportRun.findMany({
    where: { status: ReportRunStatus.QUEUED },
    orderBy: { createdAt: "asc" },
    take: limit,
    include: { reportDefinition: true },
  });
}

export async function systemMarkRunning(id: string) {
  return prisma.reportRun.update({ where: { id }, data: { status: ReportRunStatus.RUNNING } });
}

export async function systemMarkCompleted(id: string, resultStorageKey: string, rowCount: number) {
  return prisma.reportRun.update({
    where: { id },
    data: { status: ReportRunStatus.COMPLETED, resultStorageKey, rowCount, completedAt: new Date() },
  });
}

export async function systemMarkFailed(id: string, error: string) {
  return prisma.reportRun.update({
    where: { id },
    data: { status: ReportRunStatus.FAILED, error, completedAt: new Date() },
  });
}
