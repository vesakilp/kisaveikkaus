import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const { id } = await params;
  const competitionId = Number(id);

  const championBet = await prisma.championBet.findFirst({
    where: { competitionId },
    select: {
      id: true,
      predictions: {
        where: { userId: session.id },
        select: {
          optionId: true,
          option: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!championBet) {
    return NextResponse.json({ prediction: null });
  }

  return NextResponse.json({
    prediction: championBet.predictions[0] || null,
  });
}
