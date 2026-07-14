import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getJornada } from "@/lib/data/jornadas";
import { JornadaDetail } from "@/components/jornada-detail";

export default async function JornadaDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.SUPERVISOR);
  const { id } = await params;
  const [jornada, sp] = await Promise.all([getJornada(session, id), searchParams]);
  return (
    <div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <JornadaDetail jornada={jornada} basePath={`/jornadas/${id}`} canManage linkEntities />
    </div>
  );
}
