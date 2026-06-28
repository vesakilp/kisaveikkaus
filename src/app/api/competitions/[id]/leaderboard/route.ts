import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
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

  const totals: Record<number, { userId: number; displayName: string; points: number }> = {};

  for (const user of users) {
    totals[user.id] = {
      userId: user.id,
      displayName: user.displayName,
      points: 0,
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
        competition.championBet.points
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
    (a, b) => b.points - a.points || a.displayName.localeCompare(b.displayName, "fi")
  );

  return NextResponse.json({ competition: { id: competition.id, name: competition.name }, leaderboard });
}
