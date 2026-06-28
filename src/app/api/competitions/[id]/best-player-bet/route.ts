import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { parseDateTimeInput } from "@/lib/timezone";
import { NextResponse } from "next/server";

const DEFAULT_BEST_PLAYER_POINTS = 5;

function normalizeOptionNames(input: unknown) {
  if (!Array.isArray(input)) return [];

  const uniqueNames = new Set<string>();
  const options: string[] = [];

  for (const item of input) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (!normalized) continue;

    const key = normalized.toLocaleLowerCase("fi-FI");
    if (uniqueNames.has(key)) continue;

    uniqueNames.add(key);
    options.push(normalized);
  }

  return options;
}

function optionsHaveSameMembers(currentOptions: { name: string }[], nextOptions: string[]) {
  if (currentOptions.length !== nextOptions.length) return false;

  const currentKeys = new Set(currentOptions.map((option) => option.name.toLocaleLowerCase("fi-FI")));
  return nextOptions.every((option) => currentKeys.has(option.toLocaleLowerCase("fi-FI")));
}

async function requireAdminResponse() {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Kirjaudu sisään" }, { status: 401 });
    }

    return NextResponse.json({ error: "Vain adminit voivat hallita parasta pelaajaa" }, { status: 403 });
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const { id } = await params;
  const competitionId = Number(id);

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      name: true,
      bestPlayerBet: {
        include: {
          options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          resolvedOption: { select: { id: true, name: true } },
          _count: { select: { predictions: true } },
        },
      },
    },
  });

  if (!competition) {
    return NextResponse.json({ error: "Kisaa ei löydy" }, { status: 404 });
  }

  return NextResponse.json(competition);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const { id } = await params;
  const competitionId = Number(id);
  const body = await request.json();

  const bettingStart = parseDateTimeInput(body.bettingStart);
  const bettingEnd = parseDateTimeInput(body.bettingEnd);
  const options = normalizeOptionNames(body.options);
  const pointsRaw = Number(body.points);
  const points = Number.isInteger(pointsRaw) && pointsRaw > 0 ? pointsRaw : DEFAULT_BEST_PLAYER_POINTS;

  if (!bettingStart || !bettingEnd) {
    return NextResponse.json({ error: "Veikkausajan alku ja loppu ovat pakollisia" }, { status: 400 });
  }

  if (bettingEnd <= bettingStart) {
    return NextResponse.json({ error: "Veikkausajan lopun pitää olla alun jälkeen" }, { status: 400 });
  }

  if (options.length < 2) {
    return NextResponse.json({ error: "Lisää vähintään kaksi vaihtoehtoa" }, { status: 400 });
  }

  const competition = await prisma.competition.findUnique({
    where: { id: competitionId },
    select: {
      id: true,
      bestPlayerBet: {
        select: {
          id: true,
          resolvedOption: { select: { name: true } },
          options: {
            select: { id: true, name: true },
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
          _count: { select: { predictions: true } },
        },
      },
    },
  });

  if (!competition) {
    return NextResponse.json({ error: "Kisaa ei löydy" }, { status: 404 });
  }

  if (competition.bestPlayerBet?._count.predictions && !optionsHaveSameMembers(competition.bestPlayerBet.options, options)) {
    return NextResponse.json(
      { error: "Vaihtoehtoja ei voi muuttaa enää sen jälkeen kun käyttäjät ovat veikanneet" },
      { status: 400 }
    );
  }

  const bestPlayerBet = await prisma.$transaction(async (tx) => {
    if (!competition.bestPlayerBet) {
      return tx.bestPlayerBet.create({
        data: {
          competitionId,
          bettingStart,
          bettingEnd,
          points: points,
          options: {
            create: options.map((name, index) => ({ name, sortOrder: index })),
          },
        },
        include: {
          options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          resolvedOption: { select: { id: true, name: true } },
          _count: { select: { predictions: true } },
        },
      });
    }

    if (competition.bestPlayerBet._count.predictions > 0) {
      for (const [index, optionName] of options.entries()) {
        const currentOption = competition.bestPlayerBet.options.find(
          (option) => option.name.toLocaleLowerCase("fi-FI") === optionName.toLocaleLowerCase("fi-FI")
        );

        if (currentOption) {
          await tx.bestPlayerOption.update({
            where: { id: currentOption.id },
            data: { sortOrder: index },
          });
        }
      }

      return tx.bestPlayerBet.update({
        where: { id: competition.bestPlayerBet.id },
        data: {
          bettingStart,
          bettingEnd,
          points,
        },
        include: {
          options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
          resolvedOption: { select: { id: true, name: true } },
          _count: { select: { predictions: true } },
        },
      });
    }

    const preservedResolvedName = competition.bestPlayerBet.resolvedOption?.name ?? null;

    await tx.bestPlayerOption.deleteMany({
      where: { bestPlayerBetId: competition.bestPlayerBet.id },
    });

    const updatedBestPlayerBet = await tx.bestPlayerBet.update({
      where: { id: competition.bestPlayerBet.id },
      data: {
        bettingStart,
        bettingEnd,
        points,
        resolvedOptionId: null,
        options: {
          create: options.map((name, index) => ({ name, sortOrder: index })),
        },
      },
      include: {
        options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        resolvedOption: { select: { id: true, name: true } },
        _count: { select: { predictions: true } },
      },
    });

    if (!preservedResolvedName) {
      return updatedBestPlayerBet;
    }

    const matchingResolvedOption = updatedBestPlayerBet.options.find(
      (option) => option.name.toLocaleLowerCase("fi-FI") === preservedResolvedName.toLocaleLowerCase("fi-FI")
    );

    if (!matchingResolvedOption) {
      return updatedBestPlayerBet;
    }

    return tx.bestPlayerBet.update({
      where: { id: competition.bestPlayerBet.id },
      data: { resolvedOptionId: matchingResolvedOption.id },
      include: {
        options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
        resolvedOption: { select: { id: true, name: true } },
        _count: { select: { predictions: true } },
      },
    });
  });

  return NextResponse.json(bestPlayerBet);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const { id } = await params;
  const competitionId = Number(id);
  const body = await request.json();

  const resolvedOptionId =
    body.resolvedOptionId === null || body.resolvedOptionId === undefined ? null : Number(body.resolvedOptionId);

  if (resolvedOptionId !== null && (!Number.isInteger(resolvedOptionId) || resolvedOptionId <= 0)) {
    return NextResponse.json({ error: "Virheellinen paras pelaaja" }, { status: 400 });
  }

  const bestPlayerBet = await prisma.bestPlayerBet.findUnique({
    where: { competitionId },
    select: {
      id: true,
      options: {
        select: { id: true },
      },
    },
  });

  if (!bestPlayerBet) {
    return NextResponse.json({ error: "Paras pelaaja -veikkausta ei ole vielä luotu" }, { status: 404 });
  }

  if (resolvedOptionId !== null && !bestPlayerBet.options.some((option) => option.id === resolvedOptionId)) {
    return NextResponse.json({ error: "Valitun pelaajan pitää olla yksi vaihtoehdoista" }, { status: 400 });
  }

  const updatedBestPlayerBet = await prisma.bestPlayerBet.update({
    where: { id: bestPlayerBet.id },
    data: { resolvedOptionId },
    include: {
      options: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      resolvedOption: { select: { id: true, name: true } },
      _count: { select: { predictions: true } },
    },
  });

  return NextResponse.json(updatedBestPlayerBet);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const adminError = await requireAdminResponse();
  if (adminError) return adminError;

  const { id } = await params;
  const competitionId = Number(id);

  const bestPlayerBet = await prisma.bestPlayerBet.findUnique({
    where: { competitionId },
    select: {
      id: true,
      _count: { select: { predictions: true } },
    },
  });

  if (!bestPlayerBet) {
    return NextResponse.json({ error: "Paras pelaaja -veikkausta ei löydy" }, { status: 404 });
  }

  if (bestPlayerBet._count.predictions > 0) {
    return NextResponse.json(
      { error: "Paras pelaaja -veikkausta ei voi poistaa enää sen jälkeen kun käyttäjät ovat veikanneet" },
      { status: 400 }
    );
  }

  await prisma.bestPlayerBet.delete({ where: { id: bestPlayerBet.id } });
  return NextResponse.json({ success: true });
}
