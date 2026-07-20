import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listDrivers } from "@/lib/data/drivers";
import { StatusBadge } from "@/components/badges";

const LATEST_COUNT = 5;

function Kpi({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="blueprint kpi">
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
      <div className="value">{value}</div>
      <div className="label text-muted">{label}</div>
    </div>
  );
}

export default async function PanelPage() {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, drivers] = await Promise.all([listVehicles(session), listDrivers(session)]);

  const active = vehicles.filter((v) => v.status === "ACTIVE").length;
  const maintenance = vehicles.filter((v) => v.status === "IN_MAINTENANCE").length;
  const outOfService = vehicles.filter((v) => v.status === "OUT_OF_SERVICE").length;
  const withDevice = vehicles.filter((v) => v.traccarDevice).length;
  const online = vehicles.filter((v) => v.traccarDevice?.connectionStatus === "ONLINE").length;

  // listVehicles ordena por patente para los listados; acá interesa lo último
  // incorporado, así que reordenamos sobre lo ya traído en vez de ir de nuevo
  // a la base.
  const latest = [...vehicles]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, LATEST_COUNT);

  return (
    <div className="ds">
      <h1>Panel de flota</h1>

      <div className="kpi-grid">
        <Kpi value={vehicles.length} label="Vehículos en alcance" />
        <Kpi value={active} label="Operativos" />
        <Kpi value={maintenance} label="En mantenimiento" />
        <Kpi value={outOfService} label="Fuera de servicio" />
        <Kpi value={`${online}/${withDevice}`} label="GPS en línea" />
        <Kpi value={drivers.length} label="Conductores" />
      </div>

      <p className="quicklinks text-muted">
        Acceso rápido: <Link href="/flota">vehículos</Link> · <Link href="/mapa">mapa en vivo</Link> ·{" "}
        <Link href="/conductores">conductores</Link> · <Link href="/organigrama">organigrama</Link>
      </p>

      <h2>Últimos vehículos</h2>
      {latest.length === 0 ? (
        <p className="text-muted">No hay vehículos en tu alcance todavía.</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Patente</th>
              <th>Modelo</th>
              <th>Estado</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {latest.map((v) => (
              <tr key={v.id}>
                <td>
                  <Link href={`/flota/${v.id}`}>{v.plate}</Link>
                </td>
                <td>
                  {v.brand} {v.model}
                </td>
                <td>
                  <StatusBadge value={v.status} />
                </td>
                <td>
                  <StatusBadge value={v.traccarDevice?.connectionStatus ?? "UNKNOWN"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
