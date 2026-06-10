import { prisma } from "@/lib/prisma";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchPairs = await prisma.matchPair.findMany({
    where: { roundId: Number(id) },
    orderBy: { matchDate: "asc" },
  });
  return NextResponse.json(matchPairs);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Support bulk import (array) or single
    const items = Array.isArray(body) ? body : [body];
    
    // Validate data
    for (const item of items) {
      if (!item.homeTeam?.trim() || !item.awayTeam?.trim() || !parseDateTimeInput(item.matchDate)) {
        return NextResponse.json(
          { error: "Kaikki kentät ovat pakollisia (homeTeam, awayTeam, matchDate)" },
          { status: 400 }
        );
      }
    }
    
    // Increase timeout for large imports (15 seconds - Accelerate max)
    const created = await prisma.$transaction(
      items.map((item: { homeTeam: string; awayTeam: string; matchDate: string }) =>
        prisma.matchPair.create({
          data: {
            homeTeam: item.homeTeam.trim(),
            awayTeam: item.awayTeam.trim(),
            matchDate: parseDateTimeInput(item.matchDate)!,
            roundId: Number(id),
          },
        })
      ),
      {
        timeout: 15000, // 15 seconds (Prisma Accelerate maximum)
      }
    );
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating match pairs:", error);
    return NextResponse.json(
      { error: "Virhe otteluparien luomisessa", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
