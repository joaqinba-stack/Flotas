import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { DriverForm } from "@/components/driver-form";
import { createDriverAction } from "../actions";

export default async function NuevoConductorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [orgUnits, params] = await Promise.all([listOrgUnits(session), searchParams]);
  return (
    <div>
      <h1>Nuevo conductor</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <DriverForm action={createDriverAction} orgUnits={orgUnits} />
      </div>
    </div>
  );
}
