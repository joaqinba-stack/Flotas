import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { createTireAction } from "../actions";

export default async function NuevoNeumaticoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession(Role.SUPERVISOR);
  const params = await searchParams;
  return (
    <div>
      <h1>Nuevo neumático</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createTireAction}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="serialNumber">N° de serie</label>
              <input id="serialNumber" name="serialNumber" required />
            </div>
            <div className="field">
              <label htmlFor="size">Medida</label>
              <input id="size" name="size" required placeholder="265/65 R17" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="brand">Marca</label>
              <input id="brand" name="brand" required />
            </div>
            <div className="field">
              <label htmlFor="model">Modelo</label>
              <input id="model" name="model" required />
            </div>
            <div className="field">
              <label htmlFor="treadDepthMm">Dibujo (mm)</label>
              <input id="treadDepthMm" name="treadDepthMm" type="number" step="0.1" />
            </div>
          </div>
          <div>
            <button className="btn" type="submit">Crear</button>
          </div>
        </form>
      </div>
    </div>
  );
}
