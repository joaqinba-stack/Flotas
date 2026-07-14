import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getDriver } from "@/lib/data/drivers";
import { StatusBadge } from "@/components/badges";
import { fmtDate } from "@/lib/format";

export default async function ConductorDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const driver = await getDriver(session, id);

  return (
    <div>
      <div className="page-header">
        <h1>
          {driver.lastName}, {driver.firstName} <StatusBadge value={driver.status} />
        </h1>
        <Link className="btn secondary" href={`/conductores/${id}/editar`}>Editar</Link>
      </div>

      <div className="card">
        <dl className="detail-grid">
          <div><dt>Documento</dt><dd>{driver.documentId}</dd></div>
          <div><dt>Licencia</dt><dd>{driver.licenseNumber} ({driver.licenseCategory})</dd></div>
          <div><dt>Vencimiento</dt><dd>{fmtDate(driver.licenseExpiry)}</dd></div>
          <div><dt>Teléfono</dt><dd>{driver.phone ?? "—"}</dd></div>
          <div><dt>Unidad organizacional</dt><dd>{driver.orgUnit.name}</dd></div>
          <div><dt>Acceso al portal</dt><dd>{driver.user ? `${driver.user.email}${driver.user.active ? "" : " (inactivo)"}` : "Sin login"}</dd></div>
          <div>
            <dt>Vehículos asignados</dt>
            <dd>
              {driver.assignedVehicles.length > 0
                ? driver.assignedVehicles.map((v) => (
                    <span key={v.id}>
                      <Link href={`/flota/${v.id}`}>{v.plate}</Link>{" "}
                    </span>
                  ))
                : "—"}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
