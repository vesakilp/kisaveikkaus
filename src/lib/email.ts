import nodemailer from "nodemailer";
import { RESET_TOKEN_HEX_LENGTH } from "@/lib/auth/password-reset";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

function getBaseUrl(): string {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return appUrl.replace(/\/$/, "");
}

function getSmtpConfig(): SmtpConfig | null {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM;

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    return null;
  }

  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === "true" || port === 465,
    user,
    pass,
    from,
  };
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (token.length !== RESET_TOKEN_HEX_LENGTH || !/^[a-f0-9]+$/.test(token)) {
    throw new Error("Invalid reset token format");
  }

  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const smtpConfig = getSmtpConfig();

  if (!smtpConfig) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`SMTP is not configured. Development reset link for ${email}: ${resetUrl}`);
      return;
    }

    throw new Error("SMTP configuration is missing");
  }

  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.secure,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass,
    },
  });

  await transporter.verify();

  await transporter.sendMail({
    from: smtpConfig.from,
    to: email,
    subject: "Salasanan palautus",
    text:
      `Pyysit salasanan palautusta.\n\n` +
      `Avaa tämä linkki ja aseta uusi salasana:\n${resetUrl}\n\n` +
      `Linkki vanhenee 1 tunnin kuluttua.\n\n` +
      `Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.`,
    html:
      `<p>Pyysit salasanan palautusta.</p>` +
      `<p><a href="${resetUrl}" aria-label="Aseta uusi salasana Kisaveikkaus-palveluun">Aseta uusi salasana Kisaveikkaus-palveluun</a></p>` +
      `<p>Linkki vanhenee 1 tunnin kuluttua.</p>` +
      `<p>Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.</p>`,
  });
}
