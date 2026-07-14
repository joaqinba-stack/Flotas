import Link from "next/link";
import type { getJornada } from "@/lib/data/jornadas";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime, fmtNumber, fmtMoney, datetimeInputValue } from "@/lib/format";
import {
  startJornadaAction,
  completeJornadaAction,
  cancelJornadaAction,
  addViaticoAction,
  resolveViaticoAction,
  addPermitAction,
  resolvePermitAction,
  addNovedadAction,
} from "@/app/(admin)/jornadas/actions";

type Jornada = Awaited<ReturnType<typeof getJornada>>;

export function JornadaDetail({
  jornada,
  basePath,
  canManage,
  linkEntities,
}: {
  jornada: Jornada;
  basePath: string;
  canManage: boolean;
  linkEntities: boolean;
}) {
  const j = jornada;
  const isOpen = j.status === "PLANNED" || j.status === "IN_PROGRESS";

  return (
    <div>
      <div className="page-header">
        <h1>Jornada operativa <StatusBadge value={j.status} /></h1>
      </div>

      <div className="card">
        <dl className="detail-grid">
          <div><dt>Propósito</dt><dd>{j.purpose}</dd></div>
          <div>
            <dt>Vehículo</dt>
            <dd>{linkEntities ? <Link href={`/flota/${j.vehicle.id}`}>{j.vehicle.plate}</Link> : j.vehicle.plate} — {j.vehicle.brand} {j.vehicle.model}</dd>
          </div>
          <div>
            <dt>Conductor</dt>
            <dd>{linkEntities ? <Link href={`/conductores/${j.driver.id}`}>{j.driver.lastName}, {j.driver.firstName}</Link> : `${j.driver.lastName}, ${j.driver.firstName}`}</dd>
          </div>
          <div><dt>Unidad</dt><dd>{j.orgUnit.name}</dd></div>
          <div><dt>Planificada</dt><dd>{fmtDateTime(j.plannedStart)} → {fmtDateTime(j.plannedEnd)}</dd></div>
          <div><dt>Real</dt><dd>{fmtDateTime(j.actualStart)} → {fmtDateTime(j.actualEnd)}</dd></div>
          <div>
            <dt>Odómetro</dt>
            <dd>
              {j.startOdometerKm !== null ? `${fmtNumber(j.startOdometerKm)} km` : "—"} →{" "}
              {j.endOdometerKm !== null ? `${fmtNumber(j.endOdometerKm)} km` : "—"}
            </dd>
          </div>
          <div><dt>Creada por</dt><dd>{j.createdBy.name}</dd></div>
        </dl>
        {j.notes && <p className="muted">{j.notes}</p>}
      </div>

      {isOpen && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Acciones</h2>
          <div className="actions-row" style={{ flexWrap: "wrap", gap: 24 }}>
            {j.status === "PLANNED" && (
              <form className="filter-bar" style={{ margin: 0 }} action={startJornadaAction.bind(null, j.id)}>
                <div className="field">
                  <label htmlFor="start-odo">Odómetro inicial</label>
                  <input id="start-odo" name="odometerKm" type="number" min={0} />
                </div>
                <button className="btn" type="submit">Iniciar jornada</button>
              </form>
            )}
            {j.status === "IN_PROGRESS" && (
              <form className="filter-bar" style={{ margin: 0 }} action={completeJornadaAction.bind(null, j.id)}>
                <div className="field">
                  <label htmlFor="end-odo">Odómetro final</label>
                  <input id="end-odo" name="odometerKm" type="number" min={0} />
                </div>
                <button className="btn" type="submit">Completar jornada</button>
              </form>
            )}
            {canManage && (
              <form className="filter-bar" style={{ margin: 0 }} action={cancelJornadaAction.bind(null, j.id)}>
                <div className="field">
                  <label htmlFor="cancel-reason">Motivo de cancelación</label>
                  <input id="cancel-reason" name="reason" />
                </div>
                <button className="btn danger" type="submit">Cancelar</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Cargas de combustible vinculadas</h2>
        <table className="data">
          <thead><tr><th>Fecha</th><th>Litros</th><th>Odómetro</th><th>Validación</th></tr></thead>
          <tbody>
            {j.fuelLoads.map((f) => (
              <tr key={f.id}>
                <td>{fmtDateTime(f.loadedAt)}</td>
                <td>{fmtNumber(Number(f.liters), 2)} L</td>
                <td>{fmtNumber(f.odometerKm)} km</td>
                <td><StatusBadge value={f.validationStatus} /></td>
              </tr>
            ))}
            {j.fuelLoads.length === 0 && <tr><td colSpan={4} className="muted">Sin cargas vinculadas.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Viáticos</h2>
        <table className="data">
          <thead><tr><th>Concepto</th><th>Monto</th><th>Estado</th><th>Cargado por</th>{canManage && <th>Resolución</th>}</tr></thead>
          <tbody>
            {j.viaticos.map((v) => (
              <tr key={v.id}>
                <td>{v.concept}</td>
                <td>{fmtMoney(Number(v.amount))}</td>
                <td><StatusBadge value={v.status} />{v.approvedBy ? <span className="muted"> por {v.approvedBy.name}</span> : null}</td>
                <td>{v.createdBy.name}</td>
                {canManage && (
                  <td>
                    {(v.status === "REQUESTED" || v.status === "APPROVED") && (
                      <form className="actions-row" action={resolveViaticoAction.bind(null, v.id, basePath)}>
                        {v.status === "REQUESTED" && (
                          <>
                            <button className="btn small" name="decision" value="APPROVED" type="submit">Aprobar</button>
                            <button className="btn small danger" name="decision" value="REJECTED" type="submit">Rechazar</button>
                          </>
                        )}
                        {v.status === "APPROVED" && (
                          <button className="btn small secondary" name="decision" value="PAID" type="submit">Marcar pagado</button>
                        )}
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {j.viaticos.length === 0 && <tr><td colSpan={canManage ? 5 : 4} className="muted">Sin viáticos.</td></tr>}
          </tbody>
        </table>
        {isOpen && (
          <form className="filter-bar" style={{ marginTop: 12 }} action={addViaticoAction.bind(null, j.id, basePath)}>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="viatico-concept">Concepto</label>
              <input id="viatico-concept" name="concept" required />
            </div>
            <div className="field">
              <label htmlFor="viatico-amount">Monto</label>
              <input id="viatico-amount" name="amount" type="number" step="0.01" required />
            </div>
            <button className="btn" type="submit">Solicitar viático</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Permisos</h2>
        <table className="data">
          <thead><tr><th>Tipo</th><th>Descripción</th><th>Estado</th><th>Solicitado por</th>{canManage && <th>Resolución</th>}</tr></thead>
          <tbody>
            {j.permits.map((p) => (
              <tr key={p.id}>
                <td>{p.type}</td>
                <td>{p.description}</td>
                <td><StatusBadge value={p.status} />{p.approvedBy ? <span className="muted"> por {p.approvedBy.name}</span> : null}</td>
                <td>{p.requestedBy.name}</td>
                {canManage && (
                  <td>
                    {p.status === "PENDING" && (
                      <form className="actions-row" action={resolvePermitAction.bind(null, p.id, basePath)}>
                        <button className="btn small" name="decision" value="APPROVED" type="submit">Aprobar</button>
                        <button className="btn small danger" name="decision" value="REJECTED" type="submit">Rechazar</button>
                      </form>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {j.permits.length === 0 && <tr><td colSpan={canManage ? 5 : 4} className="muted">Sin permisos.</td></tr>}
          </tbody>
        </table>
        {isOpen && (
          <form className="filter-bar" style={{ marginTop: 12 }} action={addPermitAction.bind(null, j.id, basePath)}>
            <div className="field">
              <label htmlFor="permit-type">Tipo</label>
              <input id="permit-type" name="type" required placeholder="Circulación, salida, especial…" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="permit-description">Descripción</label>
              <input id="permit-description" name="description" required />
            </div>
            <button className="btn" type="submit">Solicitar permiso</button>
          </form>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Incidencias de la jornada</h2>
        <table className="data">
          <thead><tr><th>#</th><th>Título</th><th>Ocurrió</th><th>Urgencia</th><th>Estado</th></tr></thead>
          <tbody>
            {j.incidents.map((i) => (
              <tr key={i.id}>
                <td className="mono">{linkEntities ? <Link href={`/incidentes/${i.id}`}>#{i.code}</Link> : `#${i.code}`}</td>
                <td>{i.title}</td>
                <td>{fmtDateTime(i.occurredAt)}</td>
                <td><StatusBadge value={i.urgency} /></td>
                <td><StatusBadge value={i.status} /></td>
              </tr>
            ))}
            {j.incidents.length === 0 && <tr><td colSpan={5} className="muted">Sin incidencias.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Novedades</h2>
        <ul className="timeline">
          {j.novedades.map((n) => (
            <li key={n.id}>
              <div className="when">{fmtDateTime(n.occurredAt)} — {n.reportedBy.name}</div>
              <strong>{n.category}</strong>: {n.description}
            </li>
          ))}
          {j.novedades.length === 0 && <li className="muted">Sin novedades reportadas.</li>}
        </ul>
        {isOpen && (
          <form className="filter-bar" style={{ marginTop: 12 }} action={addNovedadAction.bind(null, j.id, basePath)}>
            <div className="field">
              <label htmlFor="novedad-category">Categoría</label>
              <input id="novedad-category" name="category" required placeholder="Tránsito, clima, mecánica…" />
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label htmlFor="novedad-description">Descripción</label>
              <input id="novedad-description" name="description" required />
            </div>
            <div className="field">
              <label htmlFor="novedad-occurredAt">Ocurrió</label>
              <input id="novedad-occurredAt" name="occurredAt" type="datetime-local" required defaultValue={datetimeInputValue(new Date())} />
            </div>
            <button className="btn" type="submit">Reportar</button>
          </form>
        )}
      </div>
    </div>
  );
}
