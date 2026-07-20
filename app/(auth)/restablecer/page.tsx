import Link from "next/link";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { passwordResetSchema } from "@/lib/validation/inputs";
import { isResetTokenValid, resetPasswordWithToken } from "@/lib/data/password-reset";
import { ApiError } from "@/lib/errors";

async function reset(formData: FormData) {
  "use server";
  const token = (formData.get("token") as string) ?? "";
  try {
    const parsed = passwordResetSchema.parse({
      token,
      password: formData.get("password"),
      confirm: formData.get("confirm"),
    });
    await resetPasswordWithToken(parsed.token, parsed.password);
  } catch (err) {
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      redirect(
        `/restablecer?token=${encodeURIComponent(token)}&error=${encodeURIComponent(issue?.message ?? "Datos inválidos")}`,
      );
    }
    if (err instanceof ApiError) {
      redirect(`/restablecer?token=${encodeURIComponent(token)}&error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
  redirect("/login?reset=1");
}

export default async function RestablecerPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const valid = token.length >= 20 && (await isResetTokenValid(token));

  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Definir nueva contraseña</h1>
        {params.error && <p className="alert-error">{params.error}</p>}
        {valid ? (
          <form action={reset} className="stack">
            <input type="hidden" name="token" value={token} />
            <div className="field">
              <label htmlFor="password">Nueva contraseña (mín. 8)</label>
              <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <div className="field">
              <label htmlFor="confirm">Repetir contraseña</label>
              <input id="confirm" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
            </div>
            <button className="btn" type="submit">Guardar contraseña</button>
          </form>
        ) : (
          <>
            <p className="alert-error">
              El link de recuperación es inválido o ya venció. Pedí uno nuevo desde
              “¿Olvidaste tu contraseña?”.
            </p>
            <p>
              <Link href="/recuperar">Pedir un link nuevo</Link>
            </p>
          </>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/login">Volver al ingreso</Link>
        </p>
      </div>
    </div>
  );
}
