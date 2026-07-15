import { mkdir, writeFile, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Almacenamiento local en dev; en producción se reemplaza por S3 manteniendo
// la misma interfaz storageKey.
function baseDir(): string {
  return process.env.UPLOAD_DIR ?? "./var/uploads";
}

export async function saveUpload(prefix: string, file: File): Promise<{
  storageKey: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}> {
  const safeName = file.name.replace(/[^\w.\-]/g, "_").slice(0, 120) || "archivo";
  const storageKey = path.posix.join(prefix, `${randomUUID()}-${safeName}`);
  const fullPath = path.join(baseDir(), storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, Buffer.from(await file.arrayBuffer()));
  return { storageKey, filename: file.name, mimeType: file.type || "application/octet-stream", sizeBytes: file.size };
}

export async function readUpload(storageKey: string): Promise<Buffer> {
  // storageKey siempre proviene de la DB, pero se normaliza igual por defensa.
  const normalized = path.posix.normalize(storageKey);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("storageKey inválida");
  }
  return readFile(path.join(baseDir(), normalized));
}

function reportsDir(): string {
  return process.env.REPORTS_DIR ?? "./var/reports";
}

export async function saveReportFile(
  prefix: string,
  filename: string,
  contents: Buffer,
): Promise<string> {
  const safeName = filename.replace(/[^\w.\-]/g, "_").slice(0, 120) || "reporte";
  const storageKey = path.posix.join(prefix, `${randomUUID()}-${safeName}`);
  const fullPath = path.join(reportsDir(), storageKey);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, contents);
  return storageKey;
}

export async function readReportFile(storageKey: string): Promise<Buffer> {
  const normalized = path.posix.normalize(storageKey);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) {
    throw new Error("storageKey inválida");
  }
  return readFile(path.join(reportsDir(), normalized));
}
