import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/session";
import { getChampionBetPoints } from "@/lib/champion-bet";
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
      championBet: {
        select: {
          id: true,
          points: true,
          resolvedOptionId: true,
          options: {
            select: {
              id: true,
              name: true,
            },
          },
          predictions: {
            where: { userId: targetUserId },
            select: {
              optionId: true,
              option: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
      rounds: {
        orderBy: { createdAt: "desc" },
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

  // Calculate champion bet points
  let championBet: {
    prediction: { optionId: number; optionName: string } | null;
    earnedPoints: number;
    maxPoints: number;
    isResolved: boolean;
  } | null = null;

  if (competition.championBet) {
    const cb = competition.championBet;
    const isResolved = cb.resolvedOptionId !== null;

    if (isResolved) {
      const userPrediction = cb.predictions[0] ?? null;
      const earnedPoints = userPrediction && userPrediction.optionId === cb.resolvedOptionId
        ? getChampionBetPoints()
        : 0;

      championBet = {
        prediction: userPrediction
          ? { optionId: userPrediction.optionId, optionName: userPrediction.option.name }
          : null,
        earnedPoints,
        maxPoints: getChampionBetPoints(),
        isResolved,
      };
    }
  }

  return NextResponse.json({
    user: { id: user.id, displayName: user.displayName },
    competition: { id: competition.id, name: competition.name },
    championBet,
    rounds,
  });
}
