import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listOrgUnits } from "@/lib/data/org-units";
import { listCatalogOptions } from "@/lib/data/catalogs";
import { DriverForm } from "@/components/driver-form";
import { createDriverAction } from "../actions";

export default async function NuevoConductorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const [orgUnits, statuses, licenseCategories, params] = await Promise.all([
    listOrgUnits(session),
    listCatalogOptions("DriverStatus"),
    listCatalogOptions("LICENSE_CATEGORY"),
    searchParams,
  ]);
  return (
    <div>
      <h1>Nuevo conductor</h1>
      {params.error && <p className="alert-error">{params.error}</p>}
      <div className="card">
        <DriverForm
          action={createDriverAction}
          orgUnits={orgUnits}
          statuses={statuses}
          licenseCategories={licenseCategories}
        />
      </div>
    </div>
  );
}
