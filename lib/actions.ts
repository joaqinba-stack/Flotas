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

// Una mutación que terminó bien puede igual tener algo que avisar (p. ej. se
// guardó local pero no se pudo replicar en Traccar): devolver { path, warning }
// redirige al destino normal y muestra el aviso con ?warning=.
export type FormActionResult = string | { path: string; warning?: string | null };

// Ejecuta la mutación y redirige: al destino devuelto por fn en éxito, o de
// vuelta a errorPath con ?error= en errores esperables (validación/permisos).
export async function runFormAction(
  opts: { errorPath: string; revalidate?: string[] },
  fn: () => Promise<FormActionResult>,
): Promise<never> {
  let dest: string;
  try {
    const result = await fn();
    for (const p of opts.revalidate ?? []) revalidatePath(p);
    if (typeof result === "string") {
      dest = result;
    } else {
      dest = result.warning ? appendQuery(result.path, "warning", result.warning) : result.path;
    }
  } catch (err) {
    if (!(err instanceof ApiError) && !(err instanceof ZodError)) throw err;
    dest = appendQuery(opts.errorPath, "error", messageFrom(err));
  }
  redirect(dest);
}
