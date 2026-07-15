import { systemGetAlert, systemRecipientsForAlert, systemLogNotification } from "@/lib/data/alerts";

// Sin integración real de email/SMS/push en este entorno: se registra el
// intento en AlertNotificationLog con status SENT, dejando el canal listo
// para reemplazar por un proveedor real (SES, Twilio, FCM) sin tocar el resto
// del flujo — el motor de reglas solo depende de queueAlertNotifications.
export async function queueAlertNotifications(alertId: string) {
  const alert = await systemGetAlert(alertId);
  if (!alert) return;

  const recipients = await systemRecipientsForAlert(alert.vehicleId);
  for (const recipient of recipients) {
    try {
      console.log(`[alert-notify] EMAIL a ${recipient}: ${alert.message}`);
      await systemLogNotification({ alertId, channel: "EMAIL", recipient, status: "SENT" });
    } catch (err) {
      await systemLogNotification({
        alertId,
        channel: "EMAIL",
        recipient,
        status: "FAILED",
        error: err instanceof Error ? err.message : "Error desconocido",
      });
    }
  }
}
