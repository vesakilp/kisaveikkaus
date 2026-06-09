import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const competition = await prisma.competition.findUnique({
    where: { id: Number(id) },
    include: { rounds: { orderBy: { createdAt: "asc" }, include: { _count: { select: { matchPairs: true } } } } },
  });
  if (!competition) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });
  return NextResponse.json(competition);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const name = typeof body?.name === "string" ? body.name.trim() : undefined;
  const openAiResultsPrompt =
    typeof body?.openAiResultsPrompt === "string" ? body.openAiResultsPrompt.trim() : undefined;

  if (name === undefined && openAiResultsPrompt === undefined) {
    return NextResponse.json({ error: "Ei päivitettäviä kenttiä" }, { status: 400 });
  }

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }

  if (openAiResultsPrompt !== undefined && !openAiResultsPrompt) {
    return NextResponse.json({ error: "OpenAI prompt on pakollinen" }, { status: 400 });
  }

  const competition = await prisma.competition.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(openAiResultsPrompt !== undefined ? { openAiResultsPrompt } : {}),
    },
  });
  return NextResponse.json(competition);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.competition.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
