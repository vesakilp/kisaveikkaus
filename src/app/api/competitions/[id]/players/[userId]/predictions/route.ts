import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { calculatePoints } from "@/lib/points";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await requireAuth();
  } catch {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const { id, userId } = await params;
  const competitionId = Number(id);
  const targetUserId = Number(userId);

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, displayName: true },
  });

  if (!user) {
    return NextResponse.json({ error: "Käyttäjää ei löydy" }, { status: 404 });
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      name: true,
      rounds: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          matchPairs: {
            where: {
              actualHomeScore: { not: null },
              actualAwayScore: { not: null },
            },
            orderBy: { matchDate: "asc" },
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              matchDate: true,
              actualHomeScore: true,
              actualAwayScore: true,
              predictions: {
                where: { userId: targetUserId },
                select: {
                  homeScore: true,
                  awayScore: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!competition) {
    return NextResponse.json({ error: "Kisaa ei löydy" }, { status: 404 });
  }

  const rounds = competition.rounds
    .map((round) => ({
      id: round.id,
      name: round.name,
      matchPairs: round.matchPairs.map((mp) => {
        const prediction = mp.predictions[0] ?? null;
        const pts = calculatePoints(
          prediction?.homeScore,
          prediction?.awayScore,
          mp.actualHomeScore,
          mp.actualAwayScore
        );
        return {
          id: mp.id,
          homeTeam: mp.homeTeam,
          awayTeam: mp.awayTeam,
          matchDate: mp.matchDate,
          actualHomeScore: mp.actualHomeScore,
          actualAwayScore: mp.actualAwayScore,
          prediction: prediction
            ? { homeScore: prediction.homeScore, awayScore: prediction.awayScore }
            : null,
          points: pts,
        };
      }),
    }))
    .filter((r) => r.matchPairs.length > 0);

  return NextResponse.json({
    user: { id: user.id, displayName: user.displayName },
    competition: { id: competition.id, name: competition.name },
    rounds,
  });
}
