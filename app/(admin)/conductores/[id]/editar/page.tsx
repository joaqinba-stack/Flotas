import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { getDriver } from "@/lib/data/drivers";
import { listCatalogOptions } from "@/lib/data/catalogs";
import { DriverForm } from "@/components/driver-form";
import { updateDriverAction } from "../../actions";

export default async function EditarConductorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [driver, orgUnits, statuses, licenseCategories, sp] = await Promise.all([
    getDriver(session, id),
    listOrgUnits(session),
    listCatalogOptions("DriverStatus"),
    listCatalogOptions("LICENSE_CATEGORY"),
    searchParams,
  ]);
  return (
    <div>
      <h1>Editar conductor</h1>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <div className="card">
        <DriverForm
          action={updateDriverAction.bind(null, id)}
          orgUnits={orgUnits}
          statuses={statuses}
          licenseCategories={licenseCategories}
          driver={driver}
        />
      </div>
    </div>
  );
}
