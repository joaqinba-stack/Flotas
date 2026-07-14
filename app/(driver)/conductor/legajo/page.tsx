import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { listPerformanceRecords } from "@/lib/data/performance-records";
import { PerformanceRecordList } from "@/components/performance-records";

export default async function MiLegajoPage() {
  const session = await requireSession(Role.DRIVER);
  const records = await listPerformanceRecords(session, session.driverId!);

  return (
    <div>
      <h1>Mi legajo de desempeño</h1>
      <p className="muted">Registro histórico inmutable de su desempeño como conductor.</p>
      <div className="card">
        <PerformanceRecordList records={records} />
      </div>
    </div>
  );
}
