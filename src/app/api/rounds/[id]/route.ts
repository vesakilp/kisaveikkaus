import { prisma } from "@/lib/prisma";
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
  const { name, bettingStart, bettingEnd } = await request.json();
  if (!name?.trim() || !bettingStart || !bettingEnd) {
    return NextResponse.json({ error: "Kaikki kentät ovat pakollisia" }, { status: 400 });
  }
  const round = await prisma.round.update({
    where: { id: Number(id) },
    data: { name: name.trim(), bettingStart: new Date(bettingStart), bettingEnd: new Date(bettingEnd) },
  });
  return NextResponse.json(round);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.round.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
