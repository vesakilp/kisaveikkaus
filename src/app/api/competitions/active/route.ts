import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const now = new Date();

  const competitions = await prisma.competition.findMany({
    where: {
      rounds: {
        some: {
          bettingStart: { lte: now },
          bettingEnd: { gte: now },
        },
      },
    },
    include: {
      rounds: {
        where: {
          bettingStart: { lte: now },
          bettingEnd: { gte: now },
        },
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { matchPairs: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(competitions);
}
