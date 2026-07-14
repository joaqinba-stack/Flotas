import { requireSession } from "@/lib/auth/session";
import { Role, JornadaStatus } from "@/lib/data/types";
import { listVehicles } from "@/lib/data/vehicles";
import { listJornadas } from "@/lib/data/jornadas";
import { FuelLoadForm } from "@/components/fuel-load-form";
import { createFuelLoadAction } from "../actions";

export default async function NuevaCargaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [vehicles, planned, inProgress, params] = await Promise.all([
    listVehicles(session),
    listJornadas(session, { status: JornadaStatus.PLANNED }),
    listJornadas(session, { status: JornadaStatus.IN_PROGRESS }),
    searchParams,
  ]);
  return (
    <div>
      <h1>Registrar carga de combustible</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <FuelLoadForm
          action={createFuelLoadAction}
          vehicles={vehicles}
          jornadas={[...inProgress, ...planned]}
        />
      </div>
    </div>
  );
}
