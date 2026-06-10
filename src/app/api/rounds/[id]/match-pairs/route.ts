import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type MatchPairInput = {
  externalMatchId?: string | null;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
};

type NormalizedMatchPairInput = {
  externalMatchId: string | null;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
};

function buildMatchKey(item: { externalMatchId: string | null; homeTeam: string; awayTeam: string }) {
  if (item.externalMatchId) return JSON.stringify(["external", item.externalMatchId]);
  return JSON.stringify(["teams", item.homeTeam.toLowerCase(), item.awayTeam.toLowerCase()]);
}

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

    if (!Array.isArray(body)) {
      if (!body.homeTeam?.trim() || !body.awayTeam?.trim() || !body.matchDate) {
        return NextResponse.json(
          { error: "Kaikki kentät ovat pakollisia (homeTeam, awayTeam, matchDate)" },
          { status: 400 }
        );
      }

      const matchDate = new Date(body.matchDate);
      if (Number.isNaN(matchDate.getTime())) {
        return NextResponse.json({ error: "Virheellinen matchDate" }, { status: 400 });
      }

      const existingMatch = await prisma.matchPair.findFirst({
        where: {
          roundId: Number(id),
          OR: [
            ...(body.externalMatchId?.trim() ? [{ externalMatchId: body.externalMatchId.trim() }] : []),
            { homeTeam: body.homeTeam.trim(), awayTeam: body.awayTeam.trim() },
          ],
        },
        select: { id: true },
      });
      if (existingMatch) {
        return NextResponse.json(
          { error: "Ottelupari on jo olemassa tällä kierroksella (externalMatchId tai koti+vieras)." },
          { status: 409 }
        );
      }

      const created = await prisma.matchPair.create({
        data: {
          externalMatchId: body.externalMatchId?.trim() || null,
          homeTeam: body.homeTeam.trim(),
          awayTeam: body.awayTeam.trim(),
          matchDate,
          roundId: Number(id),
        },
      });
      return NextResponse.json(created, { status: 201 });
    }

    const items: MatchPairInput[] = body;
    const normalizedItems: NormalizedMatchPairInput[] = [];
    const seenKeys = new Set<string>();

    for (const item of items) {
      if (!item.homeTeam?.trim() || !item.awayTeam?.trim() || !item.matchDate) {
        return NextResponse.json(
          { error: "Kaikki kentät ovat pakollisia (homeTeam, awayTeam, matchDate)" },
          { status: 400 }
        );
      }

      const externalMatchId = item.externalMatchId?.trim() || null;
      const normalizedItem: NormalizedMatchPairInput = {
        externalMatchId,
        homeTeam: item.homeTeam.trim(),
        awayTeam: item.awayTeam.trim(),
        matchDate: new Date(item.matchDate),
      };

      if (Number.isNaN(normalizedItem.matchDate.getTime())) {
        return NextResponse.json({ error: "Virheellinen matchDate" }, { status: 400 });
      }

      const key = buildMatchKey(normalizedItem);
      if (seenKeys.has(key)) {
        return NextResponse.json(
          { error: "JSON sisältää duplikaatteja samalla tunnisteella (externalMatchId tai homeTeam+awayTeam)" },
          { status: 400 }
        );
      }
      seenKeys.add(key);
      normalizedItems.push(normalizedItem);
    }

    const summary = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.matchPair.findMany({
          where: { roundId: Number(id) },
          select: {
            id: true,
            externalMatchId: true,
            homeTeam: true,
            awayTeam: true,
            matchDate: true,
          },
        });

        const existingByKey = new Map<string, (typeof existing)[number]>();
        const existingByExternalId = new Map<string, (typeof existing)[number]>();
        for (const match of existing) {
          const externalKey = match.externalMatchId
            ? buildMatchKey({
                externalMatchId: match.externalMatchId,
                homeTeam: match.homeTeam,
                awayTeam: match.awayTeam,
              })
            : null;
          const teamKey = buildMatchKey({
            externalMatchId: null,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
          });

          if (externalKey) {
            existingByKey.set(externalKey, match);
            existingByExternalId.set(match.externalMatchId, match);
          }
          existingByKey.set(teamKey, match);
        }

        let created = 0;
        let updated = 0;
        let unchanged = 0;

        for (const item of normalizedItems) {
          const key = buildMatchKey(item);
          const match = existingByKey.get(key);

          if (!match) {
            await tx.matchPair.create({
              data: {
                externalMatchId: item.externalMatchId,
                homeTeam: item.homeTeam,
                awayTeam: item.awayTeam,
                matchDate: item.matchDate,
                roundId: Number(id),
              },
            });
            created += 1;
            continue;
          }

          if (item.externalMatchId) {
            const conflictByExternalId = existingByExternalId.get(item.externalMatchId);
            if (conflictByExternalId && conflictByExternalId.id !== match.id) {
              throw new Error("Unique constraint: externalMatchId on jo käytössä toisella ottelulla");
            }
          }

          const shouldUpdateTeams =
            !!item.externalMatchId && (match.homeTeam !== item.homeTeam || match.awayTeam !== item.awayTeam);
          const shouldFillExternalMatchId = !match.externalMatchId && !!item.externalMatchId;
          const shouldUpdate =
            match.matchDate.getTime() !== item.matchDate.getTime() || shouldFillExternalMatchId || shouldUpdateTeams;

          if (!shouldUpdate) {
            unchanged += 1;
            continue;
          }

          await tx.matchPair.update({
            where: { id: match.id },
            data: {
              ...(shouldFillExternalMatchId ? { externalMatchId: item.externalMatchId } : {}),
              ...(shouldUpdateTeams ? { homeTeam: item.homeTeam, awayTeam: item.awayTeam } : {}),
              matchDate: item.matchDate,
            },
          });
          updated += 1;
        }

        return {
          total: normalizedItems.length,
          created,
          updated,
          unchanged,
        };
      },
      {
        timeout: 15000,
      }
    );

    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error("Error creating match pairs:", error);
    if (error instanceof Error && error.message.toLowerCase().includes("unique constraint")) {
      return NextResponse.json(
        { error: "Otteluparin tunniste on jo käytössä tällä kierroksella (externalMatchId tai koti+vieras)." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Virhe otteluparien luomisessa", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
