import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getJornada } from "@/lib/data/jornadas";
import { JornadaDetail } from "@/components/jornada-detail";
import { IncidentForm } from "@/components/incident-form";
import { createIncidentAction } from "@/app/(admin)/incidentes/actions";

export default async function MiJornadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.DRIVER);
  const { id } = await params;
  const [jornada, sp] = await Promise.all([getJornada(session, id), searchParams]);
  return (
    <div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <JornadaDetail
        jornada={jornada}
        basePath={`/conductor/jornadas/${id}`}
        canManage={false}
        linkEntities={false}
      />
      {(jornada.status === "PLANNED" || jornada.status === "IN_PROGRESS") && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Reportar incidencia en esta jornada</h2>
          <IncidentForm
            action={createIncidentAction.bind(null, `/conductor/jornadas/${id}`)}
            vehicles={[{ id: jornada.vehicle.id, plate: jornada.vehicle.plate }]}
            jornadas={[{ id: jornada.id, purpose: jornada.purpose, vehicle: { plate: jornada.vehicle.plate } }]}
          />
        </div>
      )}
    </div>
  );
}
