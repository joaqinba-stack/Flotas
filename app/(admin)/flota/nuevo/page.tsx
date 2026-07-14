import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { VehicleForm } from "@/components/vehicle-form";
import { createVehicleAction } from "../actions";

export default async function NuevoVehiculoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [orgUnits, params] = await Promise.all([listOrgUnits(session), searchParams]);
  return (
    <div>
      <h1>Nuevo vehículo</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <VehicleForm action={createVehicleAction} orgUnits={orgUnits} />
      </div>
    </div>
  );
}
