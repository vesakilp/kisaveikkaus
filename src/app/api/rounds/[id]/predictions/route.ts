import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
  }

  const { id } = await params;

  const predictions = await prisma.prediction.findMany({
    where: {
      userId: session.id,
      matchPair: { roundId: Number(id) },
    },
  });

  return NextResponse.json(predictions);
}
