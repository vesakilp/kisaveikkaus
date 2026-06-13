import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const body = await request.json();
  const { championBetId, optionId } = body;

  if (!championBetId || !optionId) {
    return NextResponse.json({ error: "Puuttuvat tiedot" }, { status: 400 });
  }

  // Check if champion bet exists and is active
  const championBet = await prisma.championBet.findUnique({
    where: { id: Number(championBetId) },
    include: {
      options: { select: { id: true } },
    },
  });

  if (!championBet) {
    return NextResponse.json({ error: "Mestariveikkausta ei löydy" }, { status: 404 });
  }

  const now = new Date();
  if (now < new Date(championBet.bettingStart)) {
    return NextResponse.json({ error: "Veikkaus ei ole vielä alkanut" }, { status: 400 });
  }

  if (now > new Date(championBet.bettingEnd)) {
    return NextResponse.json({ error: "Veikkausaika on päättynyt" }, { status: 400 });
  }

  // Check if option exists
  if (!championBet.options.some((opt) => opt.id === Number(optionId))) {
    return NextResponse.json({ error: "Virheellinen vaihtoehto" }, { status: 400 });
  }

  // Upsert prediction
  const prediction = await prisma.championPrediction.upsert({
    where: {
      userId_championBetId: {
        userId: session.id,
        championBetId: Number(championBetId),
      },
    },
    create: {
      userId: session.id,
      championBetId: Number(championBetId),
      optionId: Number(optionId),
    },
    update: {
      optionId: Number(optionId),
    },
    include: {
      option: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(prediction);
}
