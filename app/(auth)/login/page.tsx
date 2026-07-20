import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw err;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string; reset?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Plataforma Flotas</h1>
        <p className="muted">Gestión integral del parque automotor institucional</p>
        {params.error && <p className="alert-error">Credenciales inválidas o usuario inactivo.</p>}
        {params.reset && <p className="alert-ok">Contraseña actualizada. Ingresá con la nueva.</p>}
        <form action={login} className="stack">
          <input type="hidden" name="callbackUrl" value={params.callbackUrl ?? "/"} />
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" />
          </div>
          <div className="field">
            <label htmlFor="password">Contraseña</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" />
          </div>
          <button className="btn" type="submit">Ingresar</button>
        </form>
        <p style={{ marginTop: 16 }}>
          <Link href="/recuperar">¿Olvidaste tu contraseña?</Link>
        </p>
      </div>
    </div>
  );
}
