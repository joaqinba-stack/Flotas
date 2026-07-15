import { systemCreateAlert, systemHasRecentOpenAlert } from "@/lib/data/alerts";
import { queueAlertNotifications } from "@/lib/jobs/send-alert-notifications";

const DUPLICATE_WINDOW_MINUTES = 15;

// Deduplica contra alertas NEW/ACKNOWLEDGED recientes del mismo tipo+unidad
// antes de crear una nueva y encolar sus notificaciones. Usado tanto por el
// motor de reglas (evaluate-alert-rules) como por el webhook de Traccar.
export async function raiseAlert(input: Parameters<typeof systemCreateAlert>[0]) {
  const alreadyOpen = await systemHasRecentOpenAlert(
    input.vehicleId,
    input.type,
    DUPLICATE_WINDOW_MINUTES,
    input.geofenceId,
  );
  if (alreadyOpen) return null;
  const alert = await systemCreateAlert(input);
  await queueAlertNotifications(alert.id);
  return alert;
}
