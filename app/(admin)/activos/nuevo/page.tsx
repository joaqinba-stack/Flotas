import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { createAuxAssetAction } from "../actions";

export default async function NuevoActivoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  return (
    <div>
      <h1>Nuevo activo auxiliar</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createAuxAssetAction}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="code">Código de inventario</label>
              <input id="code" name="code" required />
            </div>
            <div className="field">
              <label htmlFor="category">Categoría</label>
              <input id="category" name="category" required placeholder="Herramienta, baliza, matafuego…" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="name">Nombre / descripción</label>
            <input id="name" name="name" required />
          </div>
          <div>
            <button className="btn" type="submit">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
