import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/auth/password";
import { createPasswordResetToken } from "@/lib/auth/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";

const SUCCESS_MESSAGE =
  "Jos sähköpostiosoite löytyy järjestelmästä, lähetimme ohjeet salasanan palauttamiseen.";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email || "");

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json({ error: emailValidation.error }, { status: 400 });
    }
    const normalizedEmail = emailValidation.normalizedEmail!;

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ message: SUCCESS_MESSAGE });
    }

    const token = await createPasswordResetToken(user.id);
    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({ message: SUCCESS_MESSAGE });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Salasanan palautus epäonnistui" },
      { status: 500 }
    );
  }
}
