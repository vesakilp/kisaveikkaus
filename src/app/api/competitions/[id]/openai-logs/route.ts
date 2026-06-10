import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
  }

  const { id } = await params;
  const logs = await prisma.openAiCallLog.findMany({
    where: { competitionId: Number(id) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(logs);
}
