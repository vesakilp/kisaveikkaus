import { prisma } from "@/lib/prisma";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { homeTeam, awayTeam, matchDate } = await request.json();
  const parsedMatchDate = parseDateTimeInput(matchDate);
  if (!homeTeam?.trim() || !awayTeam?.trim() || !parsedMatchDate) {
    return NextResponse.json({ error: "Kaikki kentät ovat pakollisia" }, { status: 400 });
  }
  const matchPair = await prisma.matchPair.update({
    where: { id: Number(id) },
    data: { homeTeam: homeTeam.trim(), awayTeam: awayTeam.trim(), matchDate: parsedMatchDate },
  });
  return NextResponse.json(matchPair);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.matchPair.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
