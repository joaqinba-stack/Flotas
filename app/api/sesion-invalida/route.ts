import { NextResponse } from "next/server";
import { signOut } from "@/lib/auth";

// Cierra la sesión cuyo usuario ya no existe en la base (dado de baja, o token
// emitido contra otro entorno) y manda al login con un aviso propio.
//
// Vive como route handler y no como redirect de un Server Component porque solo
// acá se puede borrar la cookie; sin borrarla el middleware rebota /login a
// /panel una y otra vez. Está fuera del matcher del middleware (excluye /api).
export async function GET(req: Request) {
  await signOut({ redirect: false });
  const url = new URL("/login", req.url);
  url.searchParams.set("sesion", "vencida");
  return NextResponse.redirect(url);
}
