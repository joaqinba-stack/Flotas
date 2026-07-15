import { requireSession } from "@/lib/auth/session";
import { Role, JornadaStatus, IncidentStatus } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listJornadas } from "@/lib/data/jornadas";
import { listIncidents } from "@/lib/data/incidents";
import { createDeskTicketAction } from "../actions";

export default async function NuevoTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.DESK_AGENT);
  const [vehicles, jornadas, incidents, params] = await Promise.all([
    listVehicles(session),
    listJornadas(session, { status: JornadaStatus.IN_PROGRESS }),
    listIncidents(session, { status: IncidentStatus.OPEN }),
    searchParams,
  ]);

  return (
    <div>
      <h1>Nuevo ticket</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <form className="stack" action={createDeskTicketAction}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="channel">Canal</label>
              <select id="channel" name="channel" defaultValue="PHONE">
                <option value="PHONE">Teléfono</option>
                <option value="EMAIL">Email</option>
                <option value="CHAT">Chat</option>
                <option value="WALKIN">Presencial</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="priority">Prioridad</label>
              <select id="priority" name="priority" defaultValue="MEDIUM">
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="requesterName">Solicitante</label>
              <input id="requesterName" name="requesterName" required />
            </div>
            <div className="field">
              <label htmlFor="requesterContact">Contacto</label>
              <input id="requesterContact" name="requesterContact" placeholder="Teléfono o email" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="subject">Asunto</label>
            <input id="subject" name="subject" required />
          </div>
          <div className="field">
            <label htmlFor="description">Descripción</label>
            <textarea id="description" name="description" rows={3} required />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="vehicleId">Vehículo (opcional)</label>
              <select id="vehicleId" name="vehicleId" defaultValue="">
                <option value="">—</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.plate}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="linkedJornadaId">Jornada vinculada (opcional)</label>
              <select id="linkedJornadaId" name="linkedJornadaId" defaultValue="">
                <option value="">—</option>
                {jornadas.map((j) => (
                  <option key={j.id} value={j.id}>{j.vehicle.plate} — {j.purpose}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="linkedIncidentId">Incidencia vinculada (opcional)</label>
              <select id="linkedIncidentId" name="linkedIncidentId" defaultValue="">
                <option value="">—</option>
                {incidents.map((i) => (
                  <option key={i.id} value={i.id}>#{i.code} — {i.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <button className="btn" type="submit">Crear ticket</button>
          </div>
        </form>
      </div>
    </div>
  );
}
