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
  const { name, bettingStart } = await request.json();
  const parsedBettingStart = parseDateTimeInput(bettingStart);

  if (!name?.trim() || !parsedBettingStart) {
    return NextResponse.json({ error: "Kierroksen nimi ja veikkauksen alkamisaika ovat pakollisia" }, { status: 400 });
  }
  const round = await prisma.round.create({
    data: {
      name: name.trim(),
      bettingStart: parsedBettingStart,
      bettingEnd: parsedBettingStart,
      competitionId: Number(id),
    },
  });
  return NextResponse.json(round, { status: 201 });
}
