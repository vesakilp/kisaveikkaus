import { prisma } from "@/lib/prisma";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const round = await prisma.round.findUnique({
    where: { id: Number(id) },
    include: { matchPairs: { orderBy: { matchDate: "asc" } }, competition: true },
  });
  if (!round) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
  return NextResponse.json(round);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, bettingStart, additionalInfo } = await request.json();
  const parsedBettingStart = parseDateTimeInput(bettingStart);

  if (!name?.trim() || !parsedBettingStart) {
    return NextResponse.json({ error: "Kierroksen nimi ja veikkauksen alkamisaika ovat pakollisia" }, { status: 400 });
  }
  const round = await prisma.round.update({
    where: { id: Number(id) },
    data: {
      name: name.trim(),
      additionalInfo: typeof additionalInfo === "string" ? additionalInfo.trim() || null : null,
      bettingStart: parsedBettingStart,
      bettingEnd: parsedBettingStart,
    },
  });
  return NextResponse.json(round);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.round.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
