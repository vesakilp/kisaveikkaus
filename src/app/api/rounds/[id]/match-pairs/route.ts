import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchPairs = await prisma.matchPair.findMany({
    where: { roundId: Number(id) },
    orderBy: { matchDate: "asc" },
  });
  return NextResponse.json(matchPairs);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();

  // Support bulk import (array) or single
  const items = Array.isArray(body) ? body : [body];
  const created = await prisma.$transaction(
    items.map((item: { homeTeam: string; awayTeam: string; matchDate: string }) =>
      prisma.matchPair.create({
        data: {
          homeTeam: item.homeTeam?.trim(),
          awayTeam: item.awayTeam?.trim(),
          matchDate: new Date(item.matchDate),
          roundId: Number(id),
        },
      })
    )
  );
  return NextResponse.json(created, { status: 201 });
}
