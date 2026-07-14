import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { getJornada } from "@/lib/data/jornadas";
import { JornadaDetail } from "@/components/jornada-detail";

export default async function MiJornadaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await requireSession(Role.DRIVER);
  const { id } = await params;
  const [jornada, sp] = await Promise.all([getJornada(session, id), searchParams]);
  return (
    <div>
      {sp.error && <p className="alert-error">{sp.error}</p>}
      <JornadaDetail
        jornada={jornada}
        basePath={`/conductor/jornadas/${id}`}
        canManage={false}
        linkEntities={false}
      />
    </div>
  );
}
