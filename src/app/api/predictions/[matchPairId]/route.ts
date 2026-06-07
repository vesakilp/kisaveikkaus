import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

function parseScoreInput(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return isNaN(n) ? null : n;
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
      homeScore: parseScoreInput(homeScore),
      awayScore: parseScoreInput(awayScore),
    },
    create: {
      userId: session.id,
      matchPairId: Number(matchPairId),
      homeScore: parseScoreInput(homeScore),
      awayScore: parseScoreInput(awayScore),
    },
  });

  return NextResponse.json(prediction);
}
