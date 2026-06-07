import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const RESET_TOKEN_EXPIRY_MINUTES = 60;
export const RESET_TOKEN_BYTE_LENGTH = 32;
export const RESET_TOKEN_HEX_LENGTH = RESET_TOKEN_BYTE_LENGTH * 2;

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const token = randomBytes(RESET_TOKEN_BYTE_LENGTH).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
      usedAt: null,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}
