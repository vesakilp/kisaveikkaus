import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id: Number(id) },
    include: {
      rounds: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          bettingStart: true,
          _count: { select: { matchPairs: true } },
          matchPairs: { select: { matchDate: true } },
        },
      },
      championBet: {
        select: {
          id: true,
          bettingStart: true,
          bettingEnd: true,
          points: true,
          options: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
            select: { id: true, name: true, sortOrder: true },
          },
        },
      },
    },
  });
  if (!competition) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
  return NextResponse.json(competition);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }
  const competition = await prisma.competition.update({
    where: { id: Number(id) },
    data: { name: name.trim() },
  });
  return NextResponse.json(competition);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.competition.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
