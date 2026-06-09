import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function parseScheduleDateInput(value: unknown) {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const calendarValidationDate = new Date(Date.UTC(year, month - 1, day));
  if (
    calendarValidationDate.getUTCFullYear() !== year ||
    calendarValidationDate.getUTCMonth() + 1 !== month ||
    calendarValidationDate.getUTCDate() !== day
  ) {
    return undefined;
  }
  return trimmed;
}

function parseScheduleHourInput(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value)) return undefined;
  if (value < 0 || value > 23) return undefined;
  return value;
}

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
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const hasName = Object.prototype.hasOwnProperty.call(body ?? {}, "name");
  const hasOpenAiResultsPrompt = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiResultsPrompt");
  const hasOpenAiScheduleStartDate = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiScheduleStartDate");
  const hasOpenAiScheduleEndDate = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiScheduleEndDate");
  const hasOpenAiScheduleStartHour = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiScheduleStartHour");
  const hasOpenAiScheduleEndHour = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiScheduleEndHour");

  const name = hasName && typeof body?.name === "string" ? body.name.trim() : undefined;
  const openAiResultsPrompt =
    hasOpenAiResultsPrompt && typeof body?.openAiResultsPrompt === "string"
      ? body.openAiResultsPrompt.trim()
      : undefined;
  const openAiScheduleStartDate = hasOpenAiScheduleStartDate
    ? parseScheduleDateInput(body?.openAiScheduleStartDate)
    : undefined;
  const openAiScheduleEndDate = hasOpenAiScheduleEndDate
    ? parseScheduleDateInput(body?.openAiScheduleEndDate)
    : undefined;
  const openAiScheduleStartHour = hasOpenAiScheduleStartHour
    ? parseScheduleHourInput(body?.openAiScheduleStartHour)
    : undefined;
  const openAiScheduleEndHour = hasOpenAiScheduleEndHour ? parseScheduleHourInput(body?.openAiScheduleEndHour) : undefined;

  if (
    !hasName &&
    !hasOpenAiResultsPrompt &&
    !hasOpenAiScheduleStartDate &&
    !hasOpenAiScheduleEndDate &&
    !hasOpenAiScheduleStartHour &&
    !hasOpenAiScheduleEndHour
  ) {
    return NextResponse.json({ error: "Ei päivitettäviä kenttiä" }, { status: 400 });
  }

  if (hasName && name === undefined) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }

  if (hasOpenAiResultsPrompt && openAiResultsPrompt === undefined) {
    return NextResponse.json({ error: "OpenAI prompt on pakollinen" }, { status: 400 });
  }

  if (openAiResultsPrompt !== undefined && !openAiResultsPrompt) {
    return NextResponse.json({ error: "OpenAI prompt on pakollinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleStartDate && openAiScheduleStartDate === undefined) {
    return NextResponse.json({ error: "Aikataulun aloituspäivä on virheellinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleEndDate && openAiScheduleEndDate === undefined) {
    return NextResponse.json({ error: "Aikataulun lopetuspäivä on virheellinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleStartHour && openAiScheduleStartHour === undefined) {
    return NextResponse.json({ error: "Aikataulun aloitustunnin tulee olla 0-23" }, { status: 400 });
  }

  if (hasOpenAiScheduleEndHour && openAiScheduleEndHour === undefined) {
    return NextResponse.json({ error: "Aikataulun lopetustunnin tulee olla 0-23" }, { status: 400 });
  }

  const existingCompetition = await prisma.competition.findUnique({
    where: { id: Number(id) },
    select: {
      openAiScheduleStartDate: true,
      openAiScheduleEndDate: true,
    },
  });
  if (!existingCompetition) return NextResponse.json({ error: "Ei löydy" }, { status: 404 });

  const resolvedStartDate =
    openAiScheduleStartDate !== undefined ? openAiScheduleStartDate : existingCompetition.openAiScheduleStartDate;
  const resolvedEndDate =
    openAiScheduleEndDate !== undefined ? openAiScheduleEndDate : existingCompetition.openAiScheduleEndDate;

  if (resolvedStartDate && resolvedEndDate && resolvedStartDate > resolvedEndDate) {
    return NextResponse.json({ error: "Aikataulun aloituspäivä ei voi olla lopetuspäivän jälkeen" }, { status: 400 });
  }

  const competition = await prisma.competition.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(openAiResultsPrompt !== undefined ? { openAiResultsPrompt } : {}),
      ...(openAiScheduleStartDate !== undefined ? { openAiScheduleStartDate } : {}),
      ...(openAiScheduleEndDate !== undefined ? { openAiScheduleEndDate } : {}),
      ...(openAiScheduleStartHour !== undefined ? { openAiScheduleStartHour } : {}),
      ...(openAiScheduleEndHour !== undefined ? { openAiScheduleEndHour } : {}),
    },
  });
  return NextResponse.json(competition);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Ei oikeuksia" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.competition.delete({ where: { id: Number(id) } });
  return NextResponse.json({ success: true });
}
