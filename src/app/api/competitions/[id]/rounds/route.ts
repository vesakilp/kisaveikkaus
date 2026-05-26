import { prisma } from "@/lib/prisma";
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
  if (!name?.trim() || !bettingStart || !bettingEnd) {
    return NextResponse.json({ error: "Kaikki kentät ovat pakollisia" }, { status: 400 });
  }
  const round = await prisma.round.create({
    data: {
      name: name.trim(),
      bettingStart: new Date(bettingStart),
      bettingEnd: new Date(bettingEnd),
      competitionId: Number(id),
    },
  });
  return NextResponse.json(round, { status: 201 });
}
