import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getGeofence } from "@/lib/data/geofences";
import { listOrgUnits } from "@/lib/data/org-units";
import { GeofenceForm } from "@/components/geofence-form";
import { updateGeofenceAction } from "../actions";

export default async function GeocercaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [geofence, orgUnits, sp] = await Promise.all([
    getGeofence(session, id),
    listOrgUnits(session),
    searchParams,
  ]);
  return (
    <div>
      <h1>{geofence.name}</h1>
      <p className="muted">Creada por {geofence.createdBy.name}</p>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <div className="card">
        <GeofenceForm action={updateGeofenceAction.bind(null, id)} orgUnits={orgUnits} geofence={geofence} />
      </div>
    </div>
  );
}
