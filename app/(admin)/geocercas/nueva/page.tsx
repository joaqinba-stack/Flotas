import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { GeofenceForm } from "@/components/geofence-form";
import { createGeofenceAction } from "../actions";

export default async function NuevaGeocercaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [orgUnits, params] = await Promise.all([listOrgUnits(session), searchParams]);
  return (
    <div>
      <h1>Nueva geocerca</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <GeofenceForm action={createGeofenceAction} orgUnits={orgUnits} />
      </div>
    </div>
  );
}
