import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const competitions = await prisma.competition.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rounds: true } } },
  });
  return NextResponse.json(competitions);
}

export async function POST(request: Request) {
  const { name } = await request.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }
  const competition = await prisma.competition.create({ data: { name: name.trim() } });
  return NextResponse.json(competition, { status: 201 });
}
