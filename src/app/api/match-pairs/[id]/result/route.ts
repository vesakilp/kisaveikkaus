import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const MAX_SCORE = 99;

function parseScore(value: unknown): { value: number | null; valid: boolean } {
  if (value === undefined || value === null || value === "") return { value: null, valid: true };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_SCORE) return { value: null, valid: false };
  return { value: n, valid: true };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
  }

  const { id } = await params;
  const { actualHomeScore, actualAwayScore } = await request.json();

  const parsedHome = parseScore(actualHomeScore);
  const parsedAway = parseScore(actualAwayScore);

  if (!parsedHome.valid || !parsedAway.valid) {
    return NextResponse.json(
      { error: "Maalimäärien pitää olla kokonaisluku väliltä 0-99" },
      { status: 400 }
    );
  }

  const matchPair = await prisma.matchPair.update({
    where: { id: Number(id) },
    data: { actualHomeScore: parsedHome.value, actualAwayScore: parsedAway.value },
  });

  return NextResponse.json(matchPair);
}
