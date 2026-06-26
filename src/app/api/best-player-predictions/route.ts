import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const body = await request.json();
  const { bestPlayerBetId, optionId } = body;

  if (!bestPlayerBetId || !optionId) {
    return NextResponse.json({ error: "Puuttuvat tiedot" }, { status: 400 });
  }

  // Check if best player bet exists and is active
  const bestPlayerBet = await prisma.bestPlayerBet.findUnique({
    where: { id: Number(bestPlayerBetId) },
    include: {
      options: { select: { id: true } },
    },
  });

  if (!bestPlayerBet) {
    return NextResponse.json({ error: "Paras pelaaja -veikkausta ei löydy" }, { status: 404 });
  }

  const now = new Date();
  if (now < new Date(bestPlayerBet.bettingStart)) {
    return NextResponse.json({ error: "Veikkaus ei ole vielä alkanut" }, { status: 400 });
  }

  if (now > new Date(bestPlayerBet.bettingEnd)) {
    return NextResponse.json({ error: "Veikkausaika on päättynyt" }, { status: 400 });
  }

  // Check if option exists
  if (!bestPlayerBet.options.some((opt) => opt.id === Number(optionId))) {
    return NextResponse.json({ error: "Virheellinen vaihtoehto" }, { status: 400 });
  }

  // Upsert prediction
  const prediction = await prisma.bestPlayerPrediction.upsert({
    where: {
      userId_bestPlayerBetId: {
        userId: session.id,
        bestPlayerBetId: Number(bestPlayerBetId),
      },
    },
    create: {
      userId: session.id,
      bestPlayerBetId: Number(bestPlayerBetId),
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
