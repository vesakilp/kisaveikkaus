import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { calculatePoints } from "@/lib/points";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const competition = await prisma.competition.findUnique({
    where: { id: Number(id) },
    include: {
      rounds: {
        include: {
          matchPairs: {
            include: {
              predictions: {
                include: { user: { select: { id: true, displayName: true } } },
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

  const allUsers = await prisma.user.findMany({
    select: { id: true, displayName: true },
  });

  const totals: Record<number, { userId: number; displayName: string; points: number }> = {};

  for (const user of allUsers) {
    totals[user.id] = { userId: user.id, displayName: user.displayName, points: 0 };
  }

  for (const round of competition.rounds) {
    for (const matchPair of round.matchPairs) {
      for (const prediction of matchPair.predictions) {
        const { total } = calculatePoints(
          prediction.homeScore,
          prediction.awayScore,
          matchPair.actualHomeScore,
          matchPair.actualAwayScore
        );
        if (!totals[prediction.userId]) {
          totals[prediction.userId] = {
            userId: prediction.userId,
            displayName: prediction.user.displayName,
            points: 0,
          };
        }
        totals[prediction.userId].points += total;
      }
    }
  }

  const leaderboard = Object.values(totals).sort((a, b) => b.points - a.points || (a.displayName ?? "").localeCompare(b.displayName ?? ""));

  return NextResponse.json({ competition: { id: competition.id, name: competition.name }, leaderboard });
}
