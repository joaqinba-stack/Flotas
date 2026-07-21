import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listCatalogDefs, listCatalogOptions } from "@/lib/data/catalogs";

export default async function DatosPage() {
  await requireSession(Role.ADMIN);
  const defs = listCatalogDefs();
  const counts = await Promise.all(
    defs.map(async (d) => (await listCatalogOptions(d.name, { includeInactive: true })).length),
  );

  const enums = defs.filter((d) => d.kind === "enum");
  const libres = defs.filter((d) => d.kind === "libre");
  const countOf = (name: string) => counts[defs.findIndex((d) => d.name === name)];

  return (
    <div>
      <div className="page-header">
        <h1>Datos</h1>
      </div>

      <p className="muted">
        Listas que alimentan los desplegables del sistema. Cambiá acá una etiqueta y se
        actualiza en todos los formularios y tablas.
      </p>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Catálogos propios</h2>
        <p className="muted">
          Alta, baja y modificación libre. Son los valores que antes se escribían a mano en
          cada formulario.
        </p>
        <table className="data">
          <thead>
            <tr><th>Catálogo</th><th>Se usa en</th><th>Valores</th></tr>
          </thead>
          <tbody>
            {libres.map((d) => (
              <tr key={d.name}>
                <td>
                  <Link href={`/datos/${d.name}`}><strong>{d.label}</strong></Link>
                  <div className="muted">{d.description}</div>
                </td>
                <td>{d.usedIn}</td>
                <td>{countOf(d.name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Listas del sistema</h2>
        <p className="muted">
          Sus valores están fijados en la base y el sistema decide con ellos (el panel cuenta
          los vehículos activos, el motor de alertas usa la urgencia). Podés cambiar cómo se
          muestran y el orden, pero no agregar ni borrar valores.
        </p>
        <table className="data">
          <thead>
            <tr><th>Lista</th><th>Se usa en</th><th>Valores</th></tr>
          </thead>
          <tbody>
            {enums.map((d) => (
              <tr key={d.name}>
                <td>
                  <Link href={`/datos/${d.name}`}><strong>{d.label}</strong></Link>
                  <div className="muted">{d.description}</div>
                </td>
                <td>{d.usedIn}</td>
                <td>{countOf(d.name)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
