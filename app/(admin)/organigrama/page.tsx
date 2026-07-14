import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { createOrgUnitAction, deleteOrgUnitAction } from "./actions";

const KIND_LABEL: Record<string, string> = {
  DIRECCION: "Dirección",
  DEPARTAMENTO: "Departamento",
  BASE_LOGISTICA: "Base logística",
};

type UnitNode = Awaited<ReturnType<typeof listOrgUnits>>[number] & { childNodes?: UnitNode[] };

function buildTree(units: UnitNode[]): UnitNode[] {
  const byId = new Map(units.map((u) => [u.id, { ...u, childNodes: [] as UnitNode[] }]));
  const roots: UnitNode[] = [];
  for (const u of byId.values()) {
    const parent = u.parentId ? byId.get(u.parentId) : undefined;
    if (parent) parent.childNodes!.push(u);
    else roots.push(u);
  }
  return roots;
}

function TreeNode({ node, isAdmin }: { node: UnitNode; isAdmin: boolean }) {
  return (
    <li>
      <strong>{node.name}</strong>{" "}
      <span className="badge gray">{KIND_LABEL[node.kind] ?? node.kind}</span>{" "}
      <span className="muted">
        {node._count.vehicles} vehículos · {node._count.drivers} conductores · {node._count.users} usuarios
      </span>{" "}
      {isAdmin && (
        <span className="actions-row" style={{ display: "inline-flex" }}>
          <Link className="btn small secondary" href={`/organigrama/${node.id}/editar`}>Editar</Link>
          {node._count.children === 0 && node._count.users === 0 && node._count.drivers === 0 && node._count.vehicles === 0 && (
            <form action={deleteOrgUnitAction.bind(null, node.id)} style={{ display: "inline" }}>
              <button className="btn small danger" type="submit">Eliminar</button>
            </form>
          )}
        </span>
      )}
      {node.childNodes && node.childNodes.length > 0 && (
        <ul>
          {node.childNodes.map((c) => (
            <TreeNode key={c.id} node={c} isAdmin={isAdmin} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function OrganigramaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [units, params] = await Promise.all([listOrgUnits(session), searchParams]);
  const tree = buildTree(units as UnitNode[]);
  const isAdmin = session.role === Role.ADMIN;

  return (
    <div>
      <h1>Organigrama institucional</h1>
      {params.error && <p className="alert-error">{params.error}</p>}

      <div className="card">
        <ul className="tree">
          {tree.map((n) => (
            <TreeNode key={n.id} node={n} isAdmin={isAdmin} />
          ))}
        </ul>
      </div>

      {isAdmin && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Nueva unidad</h2>
          <form className="filter-bar" action={createOrgUnitAction}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="name">Nombre</label>
              <input id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="kind">Tipo</label>
              <select id="kind" name="kind" defaultValue="DEPARTAMENTO">
                <option value="DIRECCION">Dirección</option>
                <option value="DEPARTAMENTO">Departamento</option>
                <option value="BASE_LOGISTICA">Base logística</option>
              </select>
            </div>
            <div className="field" style={{ minWidth: 220 }}>
              <label htmlFor="parentId">Depende de</label>
              <select id="parentId" name="parentId" defaultValue="">
                <option value="">(raíz)</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <button className="btn" type="submit">Crear</button>
          </form>
        </div>
      )}
    </div>
  );
}
