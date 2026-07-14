import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";

export default async function DriverHome() {
  const session = await requireSession(Role.DRIVER);
  return (
    <div>
      <h1>Mi panel</h1>
      <p className="muted">Sesión: {session.email}</p>
    </div>
  );
}
