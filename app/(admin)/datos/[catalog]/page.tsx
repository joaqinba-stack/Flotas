import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { findCatalog } from "@/lib/catalogs/registry";
import { listCatalogOptions, listOrphanValues } from "@/lib/data/catalogs";
import {
  createCatalogItemAction,
  saveCatalogItemAction,
  deleteCatalogItemAction,
  adoptOrphanValueAction,
} from "../actions";

export default async function CatalogoPage({
  params,
  searchParams,
}: {
  params: Promise<{ catalog: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSession(Role.ADMIN);
  const { catalog } = await params;
  const def = findCatalog(catalog);
  if (!def) notFound();

  const [options, orphans, query] = await Promise.all([
    listCatalogOptions(catalog, { includeInactive: true }),
    listOrphanValues(catalog),
    searchParams,
  ]);
  const isFixed = def.kind === "enum";

  return (
    <div>
      <div className="page-header">
        <h1>{def.label}</h1>
        <Link className="btn secondary" href="/datos">Volver a Datos</Link>
      </div>

      <p className="muted">{def.description} · Se usa en: {def.usedIn}</p>
      {query.error && <p className="alert-error">{query.error}</p>}

      {isFixed && (
        <p className="muted">
          Lista fijada por el sistema: podés cambiar la etiqueta y el orden. Para dejar de
          ofrecer un valor, desmarcá <strong>Activo</strong> — los registros que ya lo usan lo
          conservan.
        </p>
      )}

      <div className="card">
        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Etiqueta</th>
              <th>Orden</th>
              <th>Activo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {options.map((o) => (
              <tr key={o.code}>
                <td className="mono">{o.code}</td>
                <td colSpan={4}>
                  <form
                    className="filter-bar"
                    action={saveCatalogItemAction.bind(null, catalog, o.code)}
                  >
                    <div className="field" style={{ flex: 1 }}>
                      <label htmlFor={`label-${o.code}`} className="sr-only">Etiqueta</label>
                      <input
                        id={`label-${o.code}`}
                        name="label"
                        required
                        maxLength={80}
                        defaultValue={o.label}
                      />
                    </div>
                    <div className="field" style={{ maxWidth: 90 }}>
                      <label htmlFor={`sortOrder-${o.code}`} className="sr-only">Orden</label>
                      <input
                        id={`sortOrder-${o.code}`}
                        name="sortOrder"
                        type="number"
                        min={0}
                        max={999}
                        defaultValue={o.sortOrder}
                      />
                    </div>
                    <label className="field" style={{ flexDirection: "row", gap: 6 }}>
                      <input name="active" type="checkbox" defaultChecked={o.active} />
                      Activo
                    </label>
                    <button className="btn small" type="submit">Guardar</button>
                  </form>
                </td>
              </tr>
            ))}
            {options.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  Sin valores cargados todavía. Agregá el primero abajo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isFixed && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Eliminar valores</h2>
          <p className="muted">
            Solo se puede eliminar un valor que no esté en uso. Si está en uso, desactivalo.
          </p>
          <div className="actions-row" style={{ flexWrap: "wrap", gap: 8 }}>
            {options.map((o) => (
              <form key={o.code} action={deleteCatalogItemAction.bind(null, catalog, o.code)}>
                <button className="btn small danger" type="submit">Eliminar {o.label}</button>
              </form>
            ))}
          </div>
        </div>
      )}

      {!isFixed && orphans.length > 0 && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Valores ya cargados fuera del catálogo</h2>
          <p className="muted">
            Estos valores están guardados en registros existentes pero no figuran en el
            catálogo, porque se escribieron a mano antes. Agregalos para que vuelvan a
            ofrecerse en los formularios.
          </p>
          <table className="data">
            <thead>
              <tr><th>Valor</th><th>Registros</th><th></th></tr>
            </thead>
            <tbody>
              {orphans.map((o) => (
                <tr key={o.code}>
                  <td className="mono">{o.code}</td>
                  <td>{o.count}</td>
                  <td>
                    <form action={adoptOrphanValueAction.bind(null, catalog, o.code)}>
                      <button className="btn small secondary" type="submit">
                        Agregar al catálogo
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isFixed && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Nuevo valor</h2>
          <form className="filter-bar" action={createCatalogItemAction.bind(null, catalog)}>
            <div className="field">
              <label htmlFor="code">Código</label>
              <input id="code" name="code" required maxLength={40} placeholder="EJ_CAMIONETA" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="label">Etiqueta</label>
              <input id="label" name="label" required maxLength={80} placeholder="Camioneta" />
            </div>
            <div className="field" style={{ maxWidth: 90 }}>
              <label htmlFor="sortOrder">Orden</label>
              <input id="sortOrder" name="sortOrder" type="number" min={0} max={999} defaultValue={0} />
            </div>
            <button className="btn" type="submit">Agregar</button>
          </form>
          <p className="muted" style={{ marginTop: 8 }}>
            El <strong>código</strong> es lo que queda guardado en cada registro y no se puede
            cambiar después. La <strong>etiqueta</strong> es lo que se ve en pantalla y sí se
            puede editar cuando quieras.
          </p>
        </div>
      )}
    </div>
  );
}
