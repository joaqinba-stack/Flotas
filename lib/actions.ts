import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export function formDataToObject(fd: FormData): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("$")) continue;
    if (typeof v === "string") obj[k] = v;
  }
  return obj;
}

function messageFrom(err: unknown): string {
  if (err instanceof ZodError) {
    const issue = err.issues[0];
    return issue ? `${issue.path.join(".")}: ${issue.message}` : "Datos inválidos";
  }
  if (err instanceof ApiError) return err.message;
  return "Error inesperado";
}

function appendQuery(path: string, key: string, value: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${key}=${encodeURIComponent(value)}`;
}

// Ejecuta la mutación y redirige: al destino devuelto por fn en éxito, o de
// vuelta a errorPath con ?error= en errores esperables (validación/permisos).
export async function runFormAction(
  opts: { errorPath: string; revalidate?: string[] },
  fn: () => Promise<string>,
): Promise<never> {
  let dest: string;
  try {
    dest = await fn();
    for (const p of opts.revalidate ?? []) revalidatePath(p);
  } catch (err) {
    if (!(err instanceof ApiError) && !(err instanceof ZodError)) throw err;
    dest = appendQuery(opts.errorPath, "error", messageFrom(err));
  }
  redirect(dest);
}
