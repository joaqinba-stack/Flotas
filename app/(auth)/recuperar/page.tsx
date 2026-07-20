import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { passwordResetRequestSchema } from "@/lib/validation/inputs";
import { requestPasswordReset } from "@/lib/data/password-reset";

async function request(formData: FormData) {
  "use server";
  const parsed = passwordResetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) redirect("/recuperar?error=1");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  await requestPasswordReset(parsed.data.email, `${proto}://${host}`);
  redirect("/recuperar?sent=1");
}

export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>Recuperar contraseña</h1>
        <p className="muted">
          Ingresá el email de tu cuenta y te enviaremos un link para definir una contraseña nueva.
        </p>
        {params.error && <p className="alert-error">Ingresá un email válido.</p>}
        {params.sent ? (
          <p className="alert-ok">
            Si existe una cuenta con ese email, ya enviamos las instrucciones. El link vence en 60
            minutos. Si no lo recibís, contactá a un administrador: puede generarte el link desde el
            panel de Usuarios.
          </p>
        ) : (
          <form action={request} className="stack">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required autoComplete="username" />
            </div>
            <button className="btn" type="submit">Enviar instrucciones</button>
          </form>
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/login">Volver al ingreso</Link>
        </p>
      </div>
    </div>
  );
}
