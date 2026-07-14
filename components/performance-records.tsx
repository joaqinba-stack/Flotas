import type { listPerformanceRecords } from "@/lib/data/performance-records";
import { fmtDateTime } from "@/lib/format";

type Records = Awaited<ReturnType<typeof listPerformanceRecords>>;

const KIND_LABEL: Record<string, { label: string; tone: string }> = {
  COMMENDATION: { label: "Reconocimiento", tone: "green" },
  SANCTION: { label: "Sanción", tone: "red" },
  TRAINING: { label: "Capacitación", tone: "blue" },
  OBSERVATION: { label: "Observación", tone: "yellow" },
};

export function PerformanceRecordList({ records }: { records: Records }) {
  if (records.length === 0) {
    return <p className="muted">Sin registros en el legajo.</p>;
  }
  return (
    <ul className="timeline">
      {records.map((r) => {
        const kind = KIND_LABEL[r.kind] ?? { label: r.kind, tone: "gray" };
        return (
          <li key={r.id}>
            <div className="when">
              {fmtDateTime(r.createdAt)} — registrado por {r.recordedBy.name}
              {r.jornada ? ` — jornada: ${r.jornada.purpose}` : ""}
            </div>
            <span className={`badge ${kind.tone}`}>{kind.label}</span> <strong>{r.summary}</strong>
            {r.details && <div className="muted">{r.details}</div>}
          </li>
        );
      })}
    </ul>
  );
}
