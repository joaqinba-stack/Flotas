import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { listManyCatalogs } from "@/lib/data/catalogs";
import { VehicleForm } from "@/components/vehicle-form";
import { createVehicleAction } from "../actions";

export default async function NuevoVehiculoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [orgUnits, params] = await Promise.all([listOrgUnits(session), searchParams]);
  const cat = await listManyCatalogs(["FuelType", "VEHICLE_BRAND", "VEHICLE_TYPE"]);

  return (
    <div>
      <h1>Nuevo vehículo</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <VehicleForm
          action={createVehicleAction}
          orgUnits={orgUnits}
          fuelTypes={cat.FuelType}
          brands={cat.VEHICLE_BRAND}
          types={cat.VEHICLE_TYPE}
        />
      </div>
    </div>
  );
}
