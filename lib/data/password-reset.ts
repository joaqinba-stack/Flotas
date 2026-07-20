import { createHash, randomBytes } from "crypto";
import { Role } from "@prisma/client";
import { hash } from "bcryptjs";
import { prisma } from "./prisma";
import type { SessionUser } from "@/lib/auth/session";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendMail } from "@/lib/mailer";

const TOKEN_TTL_MINUTES = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Crea un token nuevo (invalidando los anteriores) y devuelve el valor plano,
// que solo viaja dentro del link. En la base queda únicamente el hash.
async function issueToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
      },
    }),
  ]);
  return token;
}

function resetUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/restablecer?token=${token}`;
}

// Flujo público "olvidé mi contraseña". Nunca revela si el email existe:
// siempre resuelve sin error; si hay cuenta activa, envía el link.
export async function requestPasswordReset(email: string, origin: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user || !user.active) return;

  const token = await issueToken(user.id);
  await sendMail({
    to: user.email,
    subject: "Recuperación de contraseña — Plataforma Flotas",
    text:
      `Hola ${user.name}:\n\n` +
      `Para restablecer tu contraseña entrá al siguiente link (vence en ${TOKEN_TTL_MINUTES} minutos):\n` +
      `${resetUrl(origin, token)}\n\n` +
      `Si no pediste este cambio, ignorá este mensaje.`,
  });
}

// Un ADMIN puede generar el link directamente desde la pantalla Usuarios y
// entregarlo por el canal que corresponda (útil sin SMTP configurado).
export async function adminCreateResetLink(
  session: SessionUser,
  userId: string,
  origin: string,
): Promise<string> {
  if (session.role !== Role.ADMIN) throw new ForbiddenError();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError("Usuario no encontrado");
  if (!user.active) throw new ValidationError("El usuario está inactivo");
  const token = await issueToken(user.id);
  return resetUrl(origin, token);
}

// Valida el token y verifica que siga vigente antes de mostrar el formulario.
export async function isResetTokenValid(token: string): Promise<boolean> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  return !!record && record.usedAt === null && record.expiresAt > new Date();
}

export async function resetPasswordWithToken(token: string, password: string): Promise<void> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, active: true } } },
  });
  if (!record || record.usedAt !== null || record.expiresAt <= new Date() || !record.user.active) {
    throw new ValidationError("El link de recuperación es inválido o ya venció. Pedí uno nuevo.");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.user.id },
      data: { passwordHash: await hash(password, 10) },
    }),
    prisma.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: record.user.id, usedAt: null, id: { not: record.id } },
    }),
  ]);
}
