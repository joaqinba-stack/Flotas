import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getVehicle } from "@/lib/data/vehicles";
import { getVehiclePositions } from "@/lib/data/positions";
import { HistoryMap } from "@/components/map/history-map";
import { fmtDateTime, fmtNumber } from "@/lib/format";

export default async function HistorialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const sp = await searchParams;
  const from = sp.from ? new Date(sp.from) : new Date(Date.now() - 24 * 3600 * 1000);
  const to = sp.to ? new Date(sp.to + "T23:59:59") : new Date();
  const [vehicle, positions] = await Promise.all([
    getVehicle(session, id),
    getVehiclePositions(session, id, { from, to, limit: 1000 }),
  ]);

  return (
    <div>
      <h1>Historial de posiciones — {vehicle.plate}</h1>
      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="from">Desde</label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? from.toISOString().slice(0, 10)} />
        </div>
        <div className="field">
          <label htmlFor="to">Hasta</label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? to.toISOString().slice(0, 10)} />
        </div>
        <button className="btn secondary" type="submit">Consultar</button>
      </form>

      <HistoryMap
        points={positions.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          recordedAt: p.recordedAt.toISOString(),
          speedKmh: p.speedKmh,
          isBuffered: p.isBuffered,
        }))}
      />

      <h2>Registros ({positions.length})</h2>
      <table className="data">
        <thead>
          <tr>
            <th>Registrado (dispositivo)</th>
            <th>Recibido</th>
            <th>Lat / Lon</th>
            <th>Velocidad</th>
            <th>Ignición</th>
            <th>Origen</th>
          </tr>
        </thead>
        <tbody>
          {positions.map((p) => (
            <tr key={p.id}>
              <td>{fmtDateTime(p.recordedAt)}</td>
              <td>{fmtDateTime(p.receivedAt)}</td>
              <td className="mono">{p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}</td>
              <td>{fmtNumber(p.speedKmh, 1)} km/h</td>
              <td>{p.ignition === null ? "—" : p.ignition ? "Encendida" : "Apagada"}</td>
              <td>{p.isBuffered ? <span className="badge yellow">Buffer offline</span> : <span className="badge green">En vivo</span>}</td>
            </tr>
          ))}
          {positions.length === 0 && (
            <tr><td colSpan={6} className="muted">Sin posiciones en el rango seleccionado.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
