import { Resend } from "resend";
import { RESET_TOKEN_HEX_LENGTH } from "@/lib/auth/password-reset";

function getBaseUrl(): string {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return appUrl.replace(/\/$/, "");
}

export async function sendPasswordResetEmail(email: string, token: string) {
  if (token.length !== RESET_TOKEN_HEX_LENGTH || !/^[a-f0-9]+$/.test(token)) {
    throw new Error("Invalid reset token format");
  }

  const resetUrl = `${getBaseUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM || "onboarding@resend.dev";

  if (!resendApiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`Resend is not configured. Development reset link for ${email}: ${resetUrl}`);
      return;
    }

    throw new Error("RESEND_API_KEY is missing");
  }

  const resend = new Resend(resendApiKey);

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Salasanan palautus",
    text:
      `Pyysit salasanan palautusta.\n\n` +
      `Avaa tämä linkki ja aseta uusi salasana:\n${resetUrl}\n\n` +
      `Linkki vanhenee 1 tunnin kuluttua.\n\n` +
      `Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.`,
    html:
      `<p>Pyysit salasanan palautusta.</p>` +
      `<p><a href="${resetUrl}" aria-label="Aseta uusi salasana Veikkauskisa-palveluun">Aseta uusi salasana Veikkauskisa-palveluun</a></p>` +
      `<p>Linkki vanhenee 1 tunnin kuluttua.</p>` +
      `<p>Jos et pyytänyt salasanan palautusta, voit jättää tämän viestin huomiotta.</p>`,
  });
}
