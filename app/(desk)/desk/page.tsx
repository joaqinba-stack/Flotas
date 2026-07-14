import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";

export default async function DeskHome() {
  const session = await requireSession(Role.DESK_AGENT);
  return (
    <div>
      <h1>Mesa de asistencia 24/7</h1>
      <p className="muted">Sesión: {session.email}</p>
    </div>
  );
}
