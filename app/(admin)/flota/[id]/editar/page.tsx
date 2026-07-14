import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { getVehicle } from "@/lib/data/vehicles";
import { VehicleForm } from "@/components/vehicle-form";
import { updateVehicleAction } from "../../actions";

export default async function EditarVehiculoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [vehicle, orgUnits, sp] = await Promise.all([
    getVehicle(session, id),
    listOrgUnits(session),
    searchParams,
  ]);
  const action = updateVehicleAction.bind(null, id);
  return (
    <div>
      <h1>Editar {vehicle.plate}</h1>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <div className="card">
        <VehicleForm action={action} orgUnits={orgUnits} vehicle={vehicle} />
      </div>
    </div>
  );
}
