import { prisma } from "@/lib/prisma";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rounds = await prisma.round.findMany({
    where: { competitionId: Number(id) },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { matchPairs: true } } },
  });
  return NextResponse.json(rounds);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, bettingStart, bettingEnd } = await request.json();
  const parsedBettingStart = parseDateTimeInput(bettingStart);
  const parsedBettingEnd = parseDateTimeInput(bettingEnd);

  if (!name?.trim() || !parsedBettingStart || !parsedBettingEnd) {
    return NextResponse.json({ error: "Kaikki kentät ovat pakollisia" }, { status: 400 });
  }
  const round = await prisma.round.create({
    data: {
      name: name.trim(),
      bettingStart: parsedBettingStart,
      bettingEnd: parsedBettingEnd,
      competitionId: Number(id),
    },
  });
  return NextResponse.json(round, { status: 201 });
}
