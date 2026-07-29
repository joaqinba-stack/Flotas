"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const POLL_MS = 2500;

// La generación de reportes es asíncrona: la corrida se encola y la procesa el
// worker. La página es un server component, así que sin esto se quedaba
// congelada mostrando la corrida en QUEUED para siempre — el archivo se
// generaba bien, pero nadie avisaba y había que recargar a ciegas.
//
// Refresca mientras haya corridas pendientes y, cuando venimos de un botón de
// descarga (?run=<id>), dispara la descarga apenas esa corrida termina.
export function RunWatcher({
  hasPending,
  watchedRunId,
  watchedStatus,
}: {
  hasPending: boolean;
  watchedRunId?: string;
  watchedStatus?: string;
}) {
  const router = useRouter();
  const alreadyDownloaded = useRef(false);

  useEffect(() => {
    if (!hasPending) return;
    const timer = setInterval(() => router.refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [hasPending, router]);

  useEffect(() => {
    if (!watchedRunId || alreadyDownloaded.current) return;
    if (watchedStatus !== "COMPLETED") return;
    // Una sola vez: el refresh periódico vuelve a renderizar con el mismo
    // estado COMPLETED y no queremos descargar el archivo en loop.
    alreadyDownloaded.current = true;
    window.location.href = `/api/report-runs/${watchedRunId}/download`;
  }, [watchedRunId, watchedStatus]);

  if (watchedStatus === "FAILED") {
    return <p className="alert-error">La generación del reporte falló. Mirá el detalle en la columna Descarga.</p>;
  }
  if (hasPending) {
    return <p className="muted">Generando el archivo… la descarga arranca sola en cuanto termine.</p>;
  }
  return null;
}
