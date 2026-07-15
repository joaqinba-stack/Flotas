import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role, DeskTicketStatus, DeskChannel } from "@/lib/data/types";
import { listDeskTickets } from "@/lib/data/desk-tickets";
import { StatusBadge } from "@/components/badges";

const CHANNEL_LABEL: Record<string, string> = {
  PHONE: "Teléfono",
  EMAIL: "Email",
  CHAT: "Chat",
  WALKIN: "Presencial",
};

export default async function DeskQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; channel?: string }>;
}) {
  const session = await requireSession(Role.DESK_AGENT);
  const params = await searchParams;
  const tickets = await listDeskTickets(session, {
    status: params.status && params.status in DeskTicketStatus ? (params.status as DeskTicketStatus) : undefined,
    channel: params.channel && params.channel in DeskChannel ? (params.channel as DeskChannel) : undefined,
  });

  return (
    <div>
      <div className="page-header">
        <h1>Cola de tickets — Mesa 24/7</h1>
        <Link className="btn" href="/desk/nuevo">Nuevo ticket</Link>
      </div>

      <form className="filter-bar" method="get">
        <div className="field">
          <label htmlFor="status">Estado</label>
          <select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">Todos</option>
            <option value="OPEN">Abierto</option>
            <option value="IN_PROGRESS">En curso</option>
            <option value="RESOLVED">Resuelto</option>
            <option value="CLOSED">Cerrado</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="channel">Canal</label>
          <select id="channel" name="channel" defaultValue={params.channel ?? ""}>
            <option value="">Todos</option>
            <option value="PHONE">Teléfono</option>
            <option value="EMAIL">Email</option>
            <option value="CHAT">Chat</option>
            <option value="WALKIN">Presencial</option>
          </select>
        </div>
        <button className="btn secondary" type="submit">Filtrar</button>
      </form>

      <table className="data">
        <thead>
          <tr><th>#</th><th>Canal</th><th>Asunto</th><th>Solicitante</th><th>Vehículo</th><th>Prioridad</th><th>Asignado</th><th>Estado</th></tr>
        </thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td className="mono"><Link href={`/desk/${t.id}`}>#{t.ticketNumber}</Link></td>
              <td>{CHANNEL_LABEL[t.channel] ?? t.channel}</td>
              <td><Link href={`/desk/${t.id}`}>{t.subject}</Link></td>
              <td>{t.requesterName}</td>
              <td>{t.vehicle ? t.vehicle.plate : "—"}</td>
              <td><StatusBadge value={t.priority} /></td>
              <td>{t.assignedTo ? t.assignedTo.name : <span className="muted">Sin asignar</span>}</td>
              <td><StatusBadge value={t.status} /></td>
            </tr>
          ))}
          {tickets.length === 0 && <tr><td colSpan={8} className="muted">Sin tickets en la cola.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
