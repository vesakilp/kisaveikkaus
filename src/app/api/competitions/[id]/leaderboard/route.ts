import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getChampionBetPoints } from "@/lib/champion-bet";
import { calculateChampionPoints, calculatePoints } from "@/lib/points";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [competition, users] = await Promise.all([
    prisma.competition.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        name: true,
        rounds: {
          select: {
            matchPairs: {
              select: {
                actualHomeScore: true,
                actualAwayScore: true,
                predictions: {
                  select: {
                    userId: true,
                    homeScore: true,
                    awayScore: true,
                  },
                },
              },
            },
          },
        },
        championBet: {
          select: {
            points: true,
            resolvedOptionId: true,
            predictions: {
              select: {
                userId: true,
                optionId: true,
              },
            },
          },
        },
        bestPlayerBet: {
          select: {
            points: true,
            resolvedOptionId: true,
            predictions: {
              select: {
                userId: true,
                optionId: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: {
        id: true,
        displayName: true,
      },
    }),
  ]);

  if (!competition) {
    return NextResponse.json({ error: "Kisaa ei löydy" }, { status: 404 });
  }

  const totals: Record<number, { userId: number; displayName: string; points: number; perfectPredictions: number }> = {};

  for (const user of users) {
    totals[user.id] = {
      userId: user.id,
      displayName: user.displayName,
      points: 0,
      perfectPredictions: 0,
    };
  }

  for (const round of competition.rounds) {
    for (const matchPair of round.matchPairs) {
      for (const prediction of matchPair.predictions) {
        if (!totals[prediction.userId]) {
          continue;
        }
        const { total } = calculatePoints(
          prediction.homeScore,
          prediction.awayScore,
          matchPair.actualHomeScore,
          matchPair.actualAwayScore
        );
        totals[prediction.userId].points += total;
        if (total === 4) {
          totals[prediction.userId].perfectPredictions += 1;
        }
      }
    }
  }

  if (competition.championBet) {
    for (const prediction of competition.championBet.predictions) {
      if (!totals[prediction.userId]) {
        continue;
      }

      totals[prediction.userId].points += calculateChampionPoints(
        prediction.optionId,
        competition.championBet.resolvedOptionId,
        getChampionBetPoints()
      );
    }
  }

  if (competition.bestPlayerBet) {
    for (const prediction of competition.bestPlayerBet.predictions) {
      if (!totals[prediction.userId]) {
        continue;
      }

      totals[prediction.userId].points += calculateChampionPoints(
        prediction.optionId,
        competition.bestPlayerBet.resolvedOptionId,
        competition.bestPlayerBet.points
      );
    }
  }

  const leaderboard = Object.values(totals).sort(
    (a, b) =>
      b.points - a.points ||
      b.perfectPredictions - a.perfectPredictions ||
      a.displayName.localeCompare(b.displayName, "fi")
  );

  const allMatchesPlayed = competition.rounds.every((round) =>
    round.matchPairs.every(
      (mp) => mp.actualHomeScore != null && mp.actualAwayScore != null
    )
  );

  return NextResponse.json({ competition: { id: competition.id, name: competition.name }, leaderboard, allMatchesPlayed });
}
