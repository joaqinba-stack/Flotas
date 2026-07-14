import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";

export default async function PanelPage() {
  const session = await requireSession(Role.SUPERVISOR);
  return (
    <div>
      <h1>Panel de flota</h1>
      <p className="muted">
        Sesión: {session.email} — rol {session.role}
        {session.orgPath ? ` — alcance ${session.orgPath}` : ""}
      </p>
    </div>
  );
}
