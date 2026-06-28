import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rounds = await prisma.round.findMany({
    where: { competitionId: Number(id) },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      bettingStart: true,
      _count: { select: { matchPairs: true } },
    },
  });
  return NextResponse.json(rounds);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, bettingStart, additionalInfo } = await request.json();
  const parsedBettingStart = parseDateTimeInput(bettingStart);

  if (!name?.trim() || !parsedBettingStart) {
    return NextResponse.json({ error: "Kierroksen nimi ja veikkauksen alkamisaika ovat pakollisia" }, { status: 400 });
  }

  const createRound = (withAdditionalInfo: boolean) =>
    prisma.round.create({
      data: {
        name: name.trim(),
        ...(withAdditionalInfo && {
          additionalInfo: typeof additionalInfo === "string" ? additionalInfo.trim() || null : null,
        }),
        bettingStart: parsedBettingStart,
        bettingEnd: parsedBettingStart,
        competitionId: Number(id),
      },
    });

  try {
    const round = await createRound(true);
    return NextResponse.json(round, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2022") {
      const round = await createRound(false);
      return NextResponse.json({ ...round, additionalInfo: null }, { status: 201 });
    }
    throw error;
  }
}
