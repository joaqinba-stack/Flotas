// Canal de email de la plataforma. En este entorno demo no hay proveedor SMTP
// configurado: el envío se registra en los logs del contenedor `app` para
// poder verificar el flujo end-to-end. Para producción, reemplazar el cuerpo
// de sendMail por un proveedor real (SES, SendGrid, SMTP propio) leyendo las
// credenciales de variables de entorno.
export type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export async function sendMail(message: MailMessage): Promise<void> {
  console.log(
    `[mailer] EMAIL a ${message.to} — ${message.subject}\n${message.text}`,
  );
}
