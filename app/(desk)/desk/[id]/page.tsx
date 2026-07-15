import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDeskTicket, listDeskAgents } from "@/lib/data/desk-tickets";
import { StatusBadge } from "@/components/badges";
import { fmtDateTime } from "@/lib/format";
import { updateDeskTicketStatusAction, assignDeskTicketAction, addDeskTicketNoteAction } from "../actions";

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: "Teléfono",
  EMAIL: "Email",
  CHAT: "Chat",
  WALKIN: "Presencial",
};

export default async function TicketDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.DESK_AGENT);
  const { id } = await params;
  const [ticket, agents, sp] = await Promise.all([
    getDeskTicket(session, id),
    listDeskAgents(session),
    searchParams,
  ]);

  return (
    <div>
      <div className="page-header">
        <h1>Ticket #{ticket.ticketNumber} <StatusBadge value={ticket.priority} /> <StatusBadge value={ticket.status} /></h1>
      </div>
      {sp.error && <p className="alert-error">{sp.error}</p>}

      <div className="card">
        <h2 style={{ marginTop: 0 }}>{ticket.subject}</h2>
        <p>{ticket.description}</p>
        <dl className="detail-grid">
          <div><dt>Canal</dt><dd>{CHANNEL_LABEL[ticket.channel] ?? ticket.channel}</dd></div>
          <div><dt>Solicitante</dt><dd>{ticket.requesterName}{ticket.requesterContact ? ` — ${ticket.requesterContact}` : ""}</dd></div>
          <div><dt>Vehículo</dt><dd>{ticket.vehicle ? <Link href={`/flota/${ticket.vehicle.id}`}>{ticket.vehicle.plate}</Link> : "—"}</dd></div>
          <div><dt>Jornada vinculada</dt><dd>{ticket.linkedJornada ? <Link href={`/jornadas/${ticket.linkedJornada.id}`}>{ticket.linkedJornada.purpose}</Link> : "—"}</dd></div>
          <div><dt>Incidencia vinculada</dt><dd>{ticket.linkedIncident ? <Link href={`/incidentes/${ticket.linkedIncident.id}`}>#{ticket.linkedIncident.code}</Link> : "—"}</dd></div>
          <div><dt>Creado por</dt><dd>{ticket.createdBy.name} — {fmtDateTime(ticket.createdAt)}</dd></div>
          <div><dt>Resuelto</dt><dd>{fmtDateTime(ticket.resolvedAt)}</dd></div>
        </dl>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Gestión</h2>
        <div className="actions-row" style={{ flexWrap: "wrap", gap: 16 }}>
          <form className="filter-bar" style={{ margin: 0 }} action={assignDeskTicketAction.bind(null, id)}>
            <div className="field">
              <label htmlFor="assignedToId">Asignar a</label>
              <select id="assignedToId" name="assignedToId" defaultValue={ticket.assignedToId ?? ""}>
                <option value="">Sin asignar</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <button className="btn secondary" type="submit">Asignar</button>
          </form>
          {ticket.status !== "CLOSED" && (
            <form className="filter-bar" style={{ margin: 0 }} action={updateDeskTicketStatusAction.bind(null, id)}>
              <div className="field">
                <label htmlFor="toStatus">Cambiar estado</label>
                <select id="toStatus" name="toStatus" defaultValue="">
                  <option value="" disabled>Seleccionar…</option>
                  {ticket.status === "OPEN" && <option value="IN_PROGRESS">En curso</option>}
                  <option value="RESOLVED">Resuelto</option>
                  <option value="CLOSED">Cerrado</option>
                </select>
              </div>
              <button className="btn" type="submit">Aplicar</button>
            </form>
          )}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Notas</h2>
        <ul className="timeline">
          {ticket.notes.map((n) => (
            <li key={n.id}>
              <div className="when">{fmtDateTime(n.createdAt)} — {n.author.name}</div>
              {n.body}
            </li>
          ))}
          {ticket.notes.length === 0 && <li className="muted">Sin notas.</li>}
        </ul>
        <form className="filter-bar" action={addDeskTicketNoteAction.bind(null, id)}>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="body">Nueva nota</label>
            <input id="body" name="body" required />
          </div>
          <button className="btn" type="submit">Agregar</button>
        </form>
      </div>
    </div>
  );
}
