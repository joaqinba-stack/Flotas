import { systemCreateAlert, systemFindOpenAlert } from "@/lib/data/alerts";
import { isPersistentAlertType } from "@/lib/validation/alert-rules";
import { queueAlertNotifications } from "@/lib/jobs/send-alert-notifications";

const DUPLICATE_WINDOW_MINUTES = 15;

// Deduplica contra alertas NEW/ACKNOWLEDGED equivalentes del mismo tipo+unidad
// antes de crear una nueva y encolar sus notificaciones. Usado tanto por el
// motor de reglas (evaluate-alert-rules) como por el webhook de Traccar.
//
// Para los tipos de condición persistente la deduplicación no usa ventana: una
// desconexión dura lo que dura y mientras la alerta siga abierta se trata del
// mismo episodio. Para los hechos puntuales (velocidad, geocercas) sigue
// valiendo la ventana de 15 minutos, que ahí es lo que evita el machaqueo.
export async function raiseAlert(input: Parameters<typeof systemCreateAlert>[0]) {
  const window = isPersistentAlertType(input.type) ? null : DUPLICATE_WINDOW_MINUTES;
  const alreadyOpen = await systemFindOpenAlert(input.vehicleId, input.type, window, input.geofenceId);
  if (alreadyOpen) return null;
  const alert = await systemCreateAlert(input);
  await queueAlertNotifications(alert.id);
  return alert;
}
