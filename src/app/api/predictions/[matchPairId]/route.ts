import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

const MAX_SCORE = 99;

interface ParsedScoreInput {
  value: number | null;
  valid: boolean;
}

/**
 * Parses a score input value.
 * Empty value is treated as cleared score.
 */
function parseScoreInput(value: unknown): ParsedScoreInput {
  if (value === undefined || value === null || value === "") return { value: null, valid: true };
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0 || n > MAX_SCORE) return { value: null, valid: false };
  return { value: n, valid: true };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ matchPairId: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const { matchPairId } = await params;
  const { homeScore, awayScore } = await request.json();
  const parsedHomeScore = parseScoreInput(homeScore);
  const parsedAwayScore = parseScoreInput(awayScore);

  if (!parsedHomeScore.valid || !parsedAwayScore.valid) {
    return NextResponse.json(
      { error: "Annettujen maalien pitää olla nolla tai positiivinen kokonaisluku" },
      { status: 400 }
    );
  }

  // Validate that the round's betting window is still open
  const matchPair = await prisma.matchPair.findUnique({
    where: { id: Number(matchPairId) },
    include: { round: true },
  });

  if (!matchPair) {
    return NextResponse.json({ error: "Otteluparia ei löydy" }, { status: 404 });
  }

  const now = new Date();
  if (now < matchPair.round.bettingStart || now > matchPair.round.bettingEnd) {
    return NextResponse.json({ error: "Veikkausaika ei ole käynnissä" }, { status: 403 });
  }

  const prediction = await prisma.prediction.upsert({
    where: {
      userId_matchPairId: {
        userId: session.id,
        matchPairId: Number(matchPairId),
      },
    },
    update: {
      homeScore: parsedHomeScore.value,
      awayScore: parsedAwayScore.value,
    },
    create: {
      userId: session.id,
      matchPairId: Number(matchPairId),
      homeScore: parsedHomeScore.value,
      awayScore: parsedAwayScore.value,
    },
  });

  return NextResponse.json(prediction);
}
