import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listDrivers } from "@/lib/data/drivers";

export default async function PanelPage() {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, drivers] = await Promise.all([listVehicles(session), listDrivers(session)]);

  const active = vehicles.filter((v) => v.status === "ACTIVE").length;
  const maintenance = vehicles.filter((v) => v.status === "IN_MAINTENANCE").length;
  const outOfService = vehicles.filter((v) => v.status === "OUT_OF_SERVICE").length;
  const withDevice = vehicles.filter((v) => v.traccarDevice).length;
  const online = vehicles.filter((v) => v.traccarDevice?.connectionStatus === "ONLINE").length;

  return (
    <div>
      <h1>Panel de flota</h1>
      <div className="stat-grid">
        <div className="stat"><div className="value">{vehicles.length}</div><div className="label">Vehículos en alcance</div></div>
        <div className="stat"><div className="value">{active}</div><div className="label">Operativos</div></div>
        <div className="stat"><div className="value">{maintenance}</div><div className="label">En mantenimiento</div></div>
        <div className="stat"><div className="value">{outOfService}</div><div className="label">Fuera de servicio</div></div>
        <div className="stat"><div className="value">{online}/{withDevice}</div><div className="label">GPS en línea</div></div>
        <div className="stat"><div className="value">{drivers.length}</div><div className="label">Conductores</div></div>
      </div>
      <p className="muted">
        Acceso rápido: <Link href="/flota">vehículos</Link> · <Link href="/mapa">mapa en vivo</Link> ·{" "}
        <Link href="/conductores">conductores</Link> · <Link href="/organigrama">organigrama</Link>
      </p>
    </div>
  );
}
