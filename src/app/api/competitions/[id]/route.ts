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

function parseScheduleTimeInput(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})$/);
  if (!match) return undefined;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return undefined;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
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
  const hasOpenAiScheduleTime = Object.prototype.hasOwnProperty.call(body ?? {}, "openAiScheduleTime");

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
  const openAiScheduleTime = hasOpenAiScheduleTime ? parseScheduleTimeInput(body?.openAiScheduleTime) : undefined;

  if (
    !hasName &&
    !hasOpenAiResultsPrompt &&
    !hasOpenAiScheduleStartDate &&
    !hasOpenAiScheduleEndDate &&
    !hasOpenAiScheduleTime
  ) {
    return NextResponse.json({ error: "Ei päivitettäviä kenttiä" }, { status: 400 });
  }

  if (hasName && !name) {
    return NextResponse.json({ error: "Nimi on pakollinen" }, { status: 400 });
  }

  if (hasOpenAiResultsPrompt && !openAiResultsPrompt) {
    return NextResponse.json({ error: "OpenAI prompt on pakollinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleStartDate && openAiScheduleStartDate === undefined) {
    return NextResponse.json({ error: "Aikataulun aloituspäivä on virheellinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleEndDate && openAiScheduleEndDate === undefined) {
    return NextResponse.json({ error: "Aikataulun lopetuspäivä on virheellinen" }, { status: 400 });
  }

  if (hasOpenAiScheduleTime && openAiScheduleTime === undefined) {
    return NextResponse.json({ error: "Aikataulun kellonajan tulee olla muodossa HH:MM" }, { status: 400 });
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
      ...(openAiScheduleTime !== undefined ? { openAiScheduleTime } : {}),
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
