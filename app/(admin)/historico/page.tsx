import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listFleetPositions, HISTORY_LIMIT_DEVICE, HISTORY_LIMIT_FLEET } from "@/lib/data/positions";
import { HistoryMap, type HistoryTrack } from "@/components/map/history-map";
import { dayInputValue, fmtNumber, inputToUtc } from "@/lib/format";
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

      <HistoryMap tracks={tracks} />
    </div>
  );
}
