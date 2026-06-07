import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const competitions = await prisma.competition.findMany({
    include: {
      rounds: {
        orderBy: { createdAt: "asc" },
        include: { _count: { select: { matchPairs: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(competitions);
}
