import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listFleetPositions, HISTORY_LIMIT_DEVICE, HISTORY_LIMIT_FLEET } from "@/lib/data/positions";
import { HistoryMap, type HistoryTrack } from "@/components/map/history-map";
import { dayInputValue, fmtDateTime, fmtNumber, inputToUtc } from "@/lib/format";
import { summarizeTrack, fmtDuration, type TrackSummary } from "@/lib/telemetry/distance";
import { exportHistoricoAction } from "./actions";

const UN_DIA_MS = 24 * 3600 * 1000;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{
    vehicleId?: string;
    from?: string;
    to?: string;
    fromTime?: string;
    toTime?: string;
    error?: string;
  }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const sp = await searchParams;

  const vehicleId = sp.vehicleId || undefined;
  const fromDay = sp.from || dayInputValue(new Date(Date.now() - UN_DIA_MS));
  const toDay = sp.to || dayInputValue();
  const fromTime = sp.fromTime || "00:00";
  const toTime = sp.toTime || "23:59";
  // Las horas se interpretan en hora de Paraguay, no en la del servidor.
  const from = inputToUtc(fromDay, fromTime);
  const to = inputToUtc(toDay, toTime);

  const [vehicles, positions] = await Promise.all([
    listVehicles(session),
    listFleetPositions(session, { vehicleId, from, to }),
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
  const tope = vehicleId ? HISTORY_LIMIT_DEVICE : HISTORY_LIMIT_FLEET;
  const topeAlcanzado = positions.length >= tope;

  // Kilometraje por dispositivo. Se calcula acá, sobre los mismos puntos que
  // dibuja el mapa, para que el cuadro y el recorrido no puedan contradecirse.
  const resumenes: Array<{ track: HistoryTrack; resumen: TrackSummary }> = tracks
    .map((track) => ({ track, resumen: summarizeTrack(track.points) }))
    .sort((a, b) => b.resumen.distanceKm - a.resumen.distanceKm);
  const totalKm = resumenes.reduce((acc, r) => acc + r.resumen.distanceKm, 0);
  const totalDescartado = resumenes.reduce((acc, r) => acc + r.resumen.discardedKm, 0);

  return (
    <div>
      <div className="page-header">
        <h1>Histórico de posiciones</h1>
      </div>

      {sp.error && <p className="alert-error">{sp.error}</p>}

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="vehicleId">Dispositivo</label>
          <select id="vehicleId" name="vehicleId" defaultValue={vehicleId ?? ""}>
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
          <input id="from" name="from" type="date" defaultValue={fromDay} />
        </div>
        <div className="field">
          <label htmlFor="fromTime">Hora</label>
          <input id="fromTime" name="fromTime" type="time" defaultValue={fromTime} />
        </div>
        <div className="field">
          <label htmlFor="to">Hasta</label>
          <input id="to" name="to" type="date" defaultValue={toDay} />
        </div>
        <div className="field">
          <label htmlFor="toTime">Hora</label>
          <input id="toTime" name="toTime" type="time" defaultValue={toTime} />
        </div>
        <button className="btn" type="submit">Consultar</button>
      </form>

      <div className="filter-bar">
        <p className="muted" style={{ flex: 1, margin: 0 }}>
          {positions.length === 0
            ? "Sin posiciones en el rango seleccionado."
            : `${fmtNumber(positions.length)} posiciones de ${tracks.length} dispositivo(s). Pasá el mouse por el recorrido para ver hora y velocidad.`}
        </p>
        {/* Repite los filtros aplicados: la descarga sale de lo que se está
            viendo, no de lo que quedó a medio tipear en el formulario. */}
        <form action={exportHistoricoAction}>
          <input type="hidden" name="vehicleId" value={vehicleId ?? ""} />
          <input type="hidden" name="from" value={fromDay} />
          <input type="hidden" name="fromTime" value={fromTime} />
          <input type="hidden" name="to" value={toDay} />
          <input type="hidden" name="toTime" value={toTime} />
          <button className="btn secondary" type="submit" disabled={positions.length === 0}>
            Descargar lo filtrado (XLSX)
          </button>
        </form>
      </div>

      {topeAlcanzado && (
        <p className="alert-error">
          El mapa llegó al tope de {fmtNumber(tope)} posiciones y está mostrando las más recientes
          del rango.{" "}
          {vehicleId
            ? "Acotá las fechas u horas."
            : "Elegí un dispositivo para ver su recorrido completo, o acotá el rango."}{" "}
          La descarga XLSX no tiene este tope: sale con todo lo filtrado.
        </p>
      )}

      {resumenes.length > 0 && (
        <div className="card">
          <div className="page-header">
            <h2 style={{ margin: 0, fontSize: 16 }}>Kilómetros recorridos</h2>
            <span className="muted">
              {fmtNumber(totalKm, 1)} km en total · {fmtNumber(totalDescartado, 1)} km descartados
              por deriva del GPS
            </span>
          </div>
          <table className="data">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th style={{ textAlign: "right" }}>Km recorridos</th>
                <th style={{ textAlign: "right" }}>Descartado (ruido)</th>
                <th style={{ textAlign: "right" }}>Vel. máx.</th>
                <th style={{ textAlign: "right" }}>En marcha</th>
                <th style={{ textAlign: "right" }}>Posiciones</th>
                <th>Primera</th>
                <th>Última</th>
              </tr>
            </thead>
            <tbody>
              {resumenes.map(({ track, resumen }) => (
                <tr key={track.id}>
                  <td>{track.label}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmtNumber(resumen.distanceKm, 1)} km
                  </td>
                  <td style={{ textAlign: "right" }} className="muted">
                    {fmtNumber(resumen.discardedKm, 1)} km
                  </td>
                  <td style={{ textAlign: "right" }}>{fmtNumber(resumen.maxSpeedKmh, 1)} km/h</td>
                  <td style={{ textAlign: "right" }}>{fmtDuration(resumen.movingSeconds)}</td>
                  <td style={{ textAlign: "right" }}>{fmtNumber(resumen.points)}</td>
                  <td>{fmtDateTime(resumen.firstAt)}</td>
                  <td>{fmtDateTime(resumen.lastAt)}</td>
                </tr>
              ))}
              {resumenes.length > 1 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>Total</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {fmtNumber(totalKm, 1)} km
                  </td>
                  <td style={{ textAlign: "right" }} className="muted">
                    {fmtNumber(totalDescartado, 1)} km
                  </td>
                  <td colSpan={5}></td>
                </tr>
              )}
            </tbody>
          </table>
          {/* El cuadro sale de los puntos que se están mostrando: si el mapa
              recortó por el tope, el kilometraje es el del tramo visible. */}
          <p className="muted" style={{ marginBottom: 0 }}>
            {topeAlcanzado
              ? "Atención: el rango superó el tope de posiciones, así que el kilometraje es solo el del tramo visible."
              : "No se cuentan los tramos con el equipo detenido, los menores a 10 m ni los saltos que implicarían más de 160 km/h: es deriva del receptor, no recorrido."}
          </p>
        </div>
      )}

      <HistoryMap tracks={tracks} />
    </div>
  );
}
