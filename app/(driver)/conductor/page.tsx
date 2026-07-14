import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDriver } from "@/lib/data/drivers";
import { listVehicles } from "@/lib/data/vehicles";
import { StatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/format";

export default async function DriverHome() {
  const session = await requireSession(Role.DRIVER);
  const [driver, vehicles] = await Promise.all([
    getDriver(session, session.driverId!),
    listVehicles(session),
  ]);

  return (
    <div>
      <h1>Mi panel</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Mis datos</h2>
        <dl className="detail-grid">
          <div><dt>Nombre</dt><dd>{driver.lastName}, {driver.firstName}</dd></div>
          <div><dt>Documento</dt><dd>{driver.documentId}</dd></div>
          <div><dt>Licencia</dt><dd>{driver.licenseNumber} ({driver.licenseCategory})</dd></div>
          <div><dt>Vencimiento de licencia</dt><dd>{fmtDate(driver.licenseExpiry)}</dd></div>
          <div><dt>Unidad</dt><dd>{driver.orgUnit.name}</dd></div>
          <div><dt>Estado</dt><dd><StatusBadge value={driver.status} /></dd></div>
        </dl>
      </div>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Vehículos asignados</h2>
        {vehicles.length === 0 ? (
          <p className="muted">No tiene vehículos asignados actualmente.</p>
        ) : (
          <table className="data">
            <thead>
              <tr><th>Placa</th><th>Vehículo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td><strong>{v.plate}</strong></td>
                  <td>{v.brand} {v.model} ({v.year})</td>
                  <td><StatusBadge value={v.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
