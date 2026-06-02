import nodemailer from 'nodemailer';
import { config } from '../config.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const smtp = config.smtp;

  if (smtp.host && smtp.port) {
    transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user
        ? { user: smtp.user, pass: smtp.pass }
        : undefined,
      tls: { rejectUnauthorized: false }
    });
  } else {
    transporter = nodemailer.createTransport({
      jsonTransport: true
    });
  }

  return transporter;
}

export async function sendPasswordResetEmail(email, resetToken) {
  const resetUrl = `${config.appBaseUrl}/restablecer-contrasena?token=${encodeURIComponent(resetToken)}`;

  const info = await getTransporter().sendMail({
    from: config.smtp.from,
    to: email,
    subject: 'Restablece tu contrasena - Autotext',
    text: `Has solicitado restablecer tu contrasena.\n\nHaz clic en el siguiente enlace para continuar:\n${resetUrl}\n\nEste enlace expira en 1 hora.\n\nSi no solicitaste esto, ignora este mensaje.`,
    html: `<p>Has solicitado restablecer tu contraseña.</p>
<p>Haz clic en el siguiente enlace para continuar:</p>
<p><a href="${resetUrl}">${resetUrl}</a></p>
<p>Este enlace expira en 1 hora.</p>
<p>Si no solicitaste esto, ignora este mensaje.</p>`
  });

  if (info.messageId) {
    console.log('[EMAIL] password reset sent to', email, 'id:', info.messageId);
  }

  if (info.response) {
    console.log('[EMAIL] response:', JSON.stringify(info.response));
  }

  return info;
}
