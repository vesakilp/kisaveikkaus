import { prisma } from "@/lib/prisma";
import { FINLAND_TIME_ZONE } from "@/lib/timezone";

const OPENAI_API_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-4.1-mini";

interface PendingMatch {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: Date;
}

interface OpenAiResult {
  matchId: number;
  homeScore: number;
  awayScore: number;
}

interface RunSummary {
  attemptedCompetitions: number;
  updatedMatches: number;
  skippedCompetitions: number;
}

function getCurrentClockInFinland(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: FINLAND_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

function getCurrentDateInFinland(now: Date) {
  return new Intl.DateTimeFormat("en-CA", {
      timeZone: FINLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function isWithinScheduleWindowFinland(
  now: Date,
  schedule: {
    startDate: string | null;
    endDate: string | null;
    time: string;
  }
) {
  const dateInFinland = getCurrentDateInFinland(now);
  if (schedule.startDate && dateInFinland < schedule.startDate) return false;
  if (schedule.endDate && dateInFinland > schedule.endDate) return false;

  return getCurrentClockInFinland(now) === schedule.time;
}

function safeParseJson(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractJsonPayload(rawText: string) {
  const trimmed = rawText.trim();
  const direct = safeParseJson(trimmed);
  if (direct) return direct;

  const fenced = trimmed.match(/```json\s*([\s\S]+?)\s*```/i);
  if (fenced?.[1]) {
    const parsed = safeParseJson(fenced[1]);
    if (parsed) return parsed;
  }

  return null;
}

function getOutputText(responseJson: unknown) {
  if (!responseJson || typeof responseJson !== "object") return "";
  if ("output_text" in responseJson && typeof responseJson.output_text === "string") {
    return responseJson.output_text;
  }

  if (!("output" in responseJson) || !Array.isArray(responseJson.output)) {
    return "";
  }

  const chunks: string[] = [];
  for (const item of responseJson.output) {
    if (!item || typeof item !== "object" || !("content" in item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (content && typeof content === "object" && "text" in content && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join("\n");
}

function normalizeResults(payload: unknown) {
  if (!payload || typeof payload !== "object" || !("results" in payload) || !Array.isArray(payload.results)) {
    return [];
  }

  const normalized: OpenAiResult[] = [];
  for (const item of payload.results) {
    if (!item || typeof item !== "object") continue;
    const { matchId, homeScore, awayScore } = item as Record<string, unknown>;
    if (
      typeof matchId === "number" &&
      Number.isInteger(matchId) &&
      typeof homeScore === "number" &&
      Number.isInteger(homeScore) &&
      typeof awayScore === "number" &&
      Number.isInteger(awayScore) &&
      homeScore >= 0 &&
      awayScore >= 0 &&
      homeScore <= 99 &&
      awayScore <= 99
    ) {
      normalized.push({ matchId, homeScore, awayScore });
    }
  }

  return normalized;
}

async function updateCompetitionResults(competition: {
  id: number;
  name: string;
  openAiResultsPrompt: string;
  openAiScheduleStartDate: string | null;
  openAiScheduleEndDate: string | null;
  openAiScheduleTime: string;
  rounds: { id: number; matchPairs: PendingMatch[] }[];
}) {
  const pendingMatches = competition.rounds.flatMap((round) => round.matchPairs);
  if (pendingMatches.length === 0) {
    return { updatedMatches: 0, skipped: true };
  }

  const prompt = competition.openAiResultsPrompt?.trim() || "Anna päättyneiden 2026 FIFA Men's World Cupin pelien tulokset";
  const requestPayload = {
    model: OPENAI_MODEL,
    input: [
      {
        role: "system",
        content:
          "Palauta vain JSON-objekti muodossa {\"results\":[{\"matchId\":number,\"homeScore\":number,\"awayScore\":number}]}. Käytä vain annettuja ottelun matchId-arvoja.",
      },
      {
        role: "user",
        content: `${prompt}\n\nOttelut:\n${JSON.stringify(
          pendingMatches.map((match) => ({
            matchId: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            matchDate: match.matchDate.toISOString(),
          })),
          null,
          2
        )}`,
      },
    ],
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    await prisma.openAiCallLog.create({
      data: {
        competitionId: competition.id,
        status: "error",
        requestPayload,
        errorMessage: "OPENAI_API_KEY puuttuu",
      },
    });
    return { updatedMatches: 0, skipped: false };
  }

  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: ["Bearer", apiKey].join(" "),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    });

    const responseJson = await response.json().catch(() => null);
    const outputText = getOutputText(responseJson);
    const parsedPayload = extractJsonPayload(outputText);
    const results = normalizeResults(parsedPayload);

    let updatedMatches = 0;
    for (const result of results) {
      const updated = await prisma.matchPair.updateMany({
        where: {
          id: result.matchId,
          round: { competitionId: competition.id },
          actualHomeScore: null,
          actualAwayScore: null,
        },
        data: {
          actualHomeScore: result.homeScore,
          actualAwayScore: result.awayScore,
        },
      });
      updatedMatches += updated.count;
    }

    await prisma.openAiCallLog.create({
      data: {
        competitionId: competition.id,
        status: response.ok ? "success" : "error",
        requestPayload,
        responsePayload: responseJson ?? { outputText },
        errorMessage: response.ok ? null : `OpenAI virhe: ${response.status}`,
        updatedMatches,
      },
    });

    return { updatedMatches, skipped: false };
  } catch (error) {
    await prisma.openAiCallLog.create({
      data: {
        competitionId: competition.id,
        status: "error",
        requestPayload,
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });
    return { updatedMatches: 0, skipped: false };
  }
}

export async function runOpenAiResultUpdate(now = new Date()): Promise<RunSummary & { skippedByTimeWindow?: boolean }> {
  const competitions = await prisma.competition.findMany({
    include: {
      rounds: {
        include: {
          matchPairs: {
            where: {
              matchDate: { lte: now },
              actualHomeScore: null,
              actualAwayScore: null,
            },
            orderBy: { matchDate: "asc" },
          },
        },
      },
    },
  });

  let attemptedCompetitions = 0;
  let updatedMatches = 0;
  let skippedCompetitions = 0;

  for (const competition of competitions) {
    if (
      !isWithinScheduleWindowFinland(now, {
        startDate: competition.openAiScheduleStartDate,
        endDate: competition.openAiScheduleEndDate,
        time: competition.openAiScheduleTime,
      })
    ) {
      skippedCompetitions += 1;
      continue;
    }

    const result = await updateCompetitionResults(competition);
    if (result.skipped) {
      skippedCompetitions += 1;
      continue;
    }

    attemptedCompetitions += 1;
    updatedMatches += result.updatedMatches;
  }

  return { attemptedCompetitions, updatedMatches, skippedCompetitions };
}
