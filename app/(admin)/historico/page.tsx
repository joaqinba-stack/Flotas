import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listFleetPositions, FLEET_HISTORY_LIMIT } from "@/lib/data/positions";
import { HistoryMap, type HistoryTrack } from "@/components/map/history-map";
import { fmtDateTimeSeconds, fmtNumber } from "@/lib/format";

const UN_DIA_MS = 24 * 3600 * 1000;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ vehicleId?: string; from?: string; to?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const sp = await searchParams;

  const desdeDefault = new Date(Date.now() - UN_DIA_MS);
  const from = sp.from ? new Date(sp.from) : desdeDefault;
  // El input date da solo el día: sin llevarlo al final de la jornada, filtrar
  // "hasta hoy" dejaría fuera todo lo de hoy salvo la medianoche exacta.
  const to = sp.to ? new Date(sp.to + "T23:59:59") : new Date();

  const [vehicles, positions] = await Promise.all([
    listVehicles(session),
    listFleetPositions(session, { vehicleId: sp.vehicleId || undefined, from, to }),
  ]);

  // Un rastro por vehículo, conservando el orden (más reciente primero) que ya
  // trae la consulta.
  const porVehiculo = new Map<string, HistoryTrack>();
  for (const p of positions) {
    let track = porVehiculo.get(p.vehicleId);
    if (!track) {
      track = { id: p.vehicleId, label: p.vehicle.plate, points: [] };
      porVehiculo.set(p.vehicleId, track);
    }
    track.points.push({
      latitude: p.latitude,
      longitude: p.longitude,
      recordedAt: p.recordedAt.toISOString(),
      speedKmh: p.speedKmh,
      isBuffered: p.isBuffered,
    });
  }
  const tracks = [...porVehiculo.values()];
  const topeAlcanzado = positions.length >= FLEET_HISTORY_LIMIT;

  return (
    <div>
      <div className="page-header">
        <h1>Histórico de posiciones</h1>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="vehicleId">Dispositivo</label>
          <select id="vehicleId" name="vehicleId" defaultValue={sp.vehicleId ?? ""}>
            <option value="">Todos</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="from">Desde</label>
          <input id="from" name="from" type="date" defaultValue={sp.from ?? from.toISOString().slice(0, 10)} />
        </div>
        <div className="field">
          <label htmlFor="to">Hasta</label>
          <input id="to" name="to" type="date" defaultValue={sp.to ?? to.toISOString().slice(0, 10)} />
        </div>
        <button className="btn" type="submit">Consultar</button>
      </form>

      <p className="muted">
        {positions.length === 0
          ? "Sin posiciones en el rango seleccionado."
          : `${fmtNumber(positions.length)} posiciones de ${tracks.length} dispositivo(s). Pasá el mouse por cualquier punto del rastro para ver hora y velocidad.`}
      </p>
      {topeAlcanzado && (
        <p className="alert-error">
          Se alcanzó el tope de {fmtNumber(FLEET_HISTORY_LIMIT)} posiciones: estás viendo las más
          recientes del rango, no todas. Acotá las fechas o elegí un dispositivo. Para el historial
          completo usá la descarga XLSX en Reportes.
        </p>
      )}

      <HistoryMap tracks={tracks} />

      {tracks.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Resumen por dispositivo</h2>
          <table className="data">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Posiciones</th>
                <th>Primera</th>
                <th>Última</th>
                <th>Velocidad máxima</th>
              </tr>
            </thead>
            <tbody>
              {tracks.map((t) => {
                const primera = t.points[t.points.length - 1];
                const ultima = t.points[0];
                const velMax = Math.max(...t.points.map((p) => p.speedKmh));
                return (
                  <tr key={t.id}>
                    <td><strong>{t.label}</strong></td>
                    <td>{fmtNumber(t.points.length)}</td>
                    <td>{fmtDateTimeSeconds(primera.recordedAt)}</td>
                    <td>{fmtDateTimeSeconds(ultima.recordedAt)}</td>
                    <td>{fmtNumber(velMax, 1)} km/h</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
