import { requireSession } from "@/lib/auth/session";
import { Role } from "@/lib/data/types";
import { LiveMap } from "@/components/map/live-map";

export default async function MapaPage() {
  await requireSession(Role.SUPERVISOR, Role.DESK_AGENT);
  return (
    <div>
      <h1>Mapa en vivo</h1>
      <p className="muted">
        Últimas posiciones de la flota dentro de su alcance. Azul: dispositivo en línea; rojo:
        desconectado. Actualiza cada 5 segundos.
      </p>
      <LiveMap />
    </div>
  );
}
