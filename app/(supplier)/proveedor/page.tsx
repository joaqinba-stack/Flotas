import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";

export default async function SupplierHome() {
  const session = await requireSession(Role.SUPPLIER);
  return (
    <div>
      <h1>Mis órdenes de servicio</h1>
      <p className="muted">Sesión: {session.email}</p>
    </div>
  );
}
