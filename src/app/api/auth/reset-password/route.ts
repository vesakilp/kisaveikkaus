import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePassword } from "@/lib/auth/password";
import { hashResetToken, RESET_TOKEN_HEX_LENGTH } from "@/lib/auth/password-reset";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || token.length !== RESET_TOKEN_HEX_LENGTH) {
      return NextResponse.json(
        { error: "Virheellinen tai vanhentunut palautuslinkki" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.error }, { status: 400 });
    }

    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
      },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Virheellinen tai vanhentunut palautuslinkki" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
      // Invalidate previously issued reset links for the same user.
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          usedAt: null,
        },
      }),
    ]);

    return NextResponse.json({ message: "Salasana on vaihdettu onnistuneesti" });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Salasanan vaihto epäonnistui" },
      { status: 500 }
    );
  }
}
