import { requireSession } from "@/lib/auth/session";
import { Role, JornadaStatus } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listJornadas } from "@/lib/data/jornadas";
import { listManyCatalogs } from "@/lib/data/catalogs";
import { IncidentForm } from "@/components/incident-form";
import { createIncidentAction } from "../actions";

export default async function NuevaIncidenciaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, inProgress, planned, params] = await Promise.all([
    listVehicles(session),
    listJornadas(session, { status: JornadaStatus.IN_PROGRESS }),
    listJornadas(session, { status: JornadaStatus.PLANNED }),
    searchParams,
  ]);
  const cat = await listManyCatalogs(["IncidentUrgency", "INCIDENT_CATEGORY"]);
  return (
    <div>
      <h1>Registrar incidencia</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <IncidentForm
          action={createIncidentAction.bind(null, "/incidentes/nueva")}
          vehicles={vehicles}
          jornadas={[...inProgress, ...planned]}
          urgencies={cat.IncidentUrgency}
          categories={cat.INCIDENT_CATEGORY}
        />
      </div>
    </div>
  );
}
