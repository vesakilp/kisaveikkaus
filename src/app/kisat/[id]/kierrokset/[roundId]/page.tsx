"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { formatDateTimeInFinland } from "@/lib/timezone";

interface MatchPair {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
}

interface Round {
  id: number;
  name: string;
  bettingStart: string;
  bettingEnd: string;
  matchPairs: MatchPair[];
  competition: { id: number; name: string };
}

interface Prediction {
  matchPairId: number;
  homeScore: number | null;
  awayScore: number | null;
}

type ScoreField = "homeScore" | "awayScore";

const MAX_SCORE_DIGITS = 2;
const DEFAULT_SCORE = "0";
const SCORE_INPUT_PATTERN = new RegExp(`^\\d{0,${MAX_SCORE_DIGITS}}$`);
const MAX_TIMER_DELAY_MS = 60_000;
const BETTING_WINDOW_TICK_BUFFER_MS = 100;

function scoreToString(score: number | null | undefined): string {
  return score !== null && score !== undefined ? String(score) : DEFAULT_SCORE;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function StatusIcon({ isSaving, saveError, showOk }: { isSaving: boolean; saveError?: string; showOk: boolean }) {
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center"
      aria-label={isSaving ? "Tallennetaan" : saveError ? saveError : showOk ? "Tallennettu" : undefined}
    >
      {isSaving ? (
        <svg className="h-4 w-4 animate-spin text-gray-300" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : saveError ? (
        <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ) : showOk ? (
        <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : null}
    </div>
  );
}

export default function RoundPredictionPage() {
  const params = useParams();
  const roundId = params.roundId as string;

  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState<Record<number, { homeScore: string; awayScore: string }>>({});
  const [savedAt, setSavedAt] = useState<Record<number, number>>({});
  const [saving, setSaving] = useState<Record<number, boolean>>({});
  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const iconTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const [saveErrors, setSaveErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    Promise.all([
      fetch(`/api/rounds/${roundId}`).then((r) => {
        if (!r.ok) throw new Error("Kierrosta ei löydy");
        return r.json();
      }),
      fetch(`/api/rounds/${roundId}/predictions`).then((r) => {
        if (!r.ok) throw new Error("Veikkauksia ei voitu ladata");
        return r.json();
      }),
    ])
      .then(([roundData, predictionsData]: [Round, Prediction[]]) => {
        setRound(roundData);
        const initial: Record<number, { homeScore: string; awayScore: string }> = {};
        for (const matchPair of roundData.matchPairs ?? []) {
          const prediction = predictionsData.find((item) => item.matchPairId === matchPair.id);
          initial[matchPair.id] = {
            homeScore: scoreToString(prediction?.homeScore),
            awayScore: scoreToString(prediction?.awayScore),
          };
        }
        setScores(initial);
      })
      .catch(() => setRound(null))
      .finally(() => setLoading(false));
  }, [roundId]);

  useEffect(() => {
    const iconTimerValues = iconTimers.current;
    const saveTimerValues = saveTimers.current;

    return () => {
      for (const timer of Object.values(iconTimerValues)) clearTimeout(timer);
      for (const timer of Object.values(saveTimerValues)) clearTimeout(timer);
    };
  }, []);

  const bettingWindow = useMemo(() => {
    if (!round) return { start: NaN, end: NaN, isOpen: false };
    const start = new Date(round.bettingStart).getTime();
    const end = new Date(round.bettingEnd).getTime();
    return { start, end, isOpen: currentTime >= start && currentTime <= end };
  }, [round, currentTime]);

  useEffect(() => {
    if (!round) return;

    const now = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const tick = () => setCurrentTime(Date.now());
    const start = new Date(round.bettingStart).getTime();
    const end = new Date(round.bettingEnd).getTime();

    if (now < start) timers.push(setTimeout(tick, start - now + BETTING_WINDOW_TICK_BUFFER_MS));
    if (now < end) timers.push(setTimeout(tick, end - now + BETTING_WINDOW_TICK_BUFFER_MS));

    let interval: ReturnType<typeof setInterval> | null = null;
    if (now < end) {
      const intervalId = setInterval(() => {
        const nextNow = Date.now();
        setCurrentTime(nextNow);
        if (nextNow > end) clearInterval(intervalId);
      }, MAX_TIMER_DELAY_MS);
      interval = intervalId;
    }

    return () => {
      if (interval) clearInterval(interval);
      for (const timer of timers) clearTimeout(timer);
    };
  }, [round]);

  const savePrediction = useCallback(async (matchPairId: number, homeScore: string, awayScore: string) => {
    setSaving((prev) => ({ ...prev, [matchPairId]: true }));
    setSaveErrors((prev) => {
      const next = { ...prev };
      delete next[matchPairId];
      return next;
    });

    try {
      const res = await fetch(`/api/predictions/${matchPairId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeScore, awayScore }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveErrors((prev) => ({ ...prev, [matchPairId]: data.error ?? "Tallennus epäonnistui" }));
        return;
      }

      setSavedAt((prev) => ({ ...prev, [matchPairId]: Date.now() }));

      if (iconTimers.current[matchPairId]) clearTimeout(iconTimers.current[matchPairId]);
      iconTimers.current[matchPairId] = setTimeout(() => {
        setSavedAt((prev) => {
          const next = { ...prev };
          delete next[matchPairId];
          return next;
        });
      }, 3000);
    } catch {
      setSaveErrors((prev) => ({ ...prev, [matchPairId]: "Tallennus epäonnistui" }));
    } finally {
      setSaving((prev) => ({ ...prev, [matchPairId]: false }));
    }
  }, []);

  const handleScoreChange = useCallback((matchPairId: number, field: ScoreField, value: string) => {
    if (!round || !bettingWindow.isOpen) return;
    if (value !== "" && !SCORE_INPUT_PATTERN.test(value)) return;

    setScores((prev) => {
      const current = prev[matchPairId] ?? { homeScore: DEFAULT_SCORE, awayScore: DEFAULT_SCORE };
      const updated = { ...current, [field]: value };

      if (saveTimers.current[matchPairId]) clearTimeout(saveTimers.current[matchPairId]);
      saveTimers.current[matchPairId] = setTimeout(() => {
        savePrediction(matchPairId, updated.homeScore, updated.awayScore);
      }, 500);

      return { ...prev, [matchPairId]: updated };
    });
  }, [bettingWindow.isOpen, round, savePrediction]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ladataan…</p>
      </div>
    );
  }

  if (!round) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-red-500">Kierrosta ei löydy</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.values(saving).some(Boolean) && "Tallennetaan…"}
        {Object.values(saveErrors).filter(Boolean).length > 0 && "Tallennus epäonnistui. Yritä uudelleen."}
      </div>

      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center gap-3">
            <Link href="/kisat" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← {round.competition.name}
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{round.name}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Veikkaus päättyy: {formatDateTimeInFinland(round.bettingEnd)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <p className="mb-4 text-sm text-gray-500">
          Anna otteluiden tulokset. Tulokset tallentuvat automaattisesti.
        </p>

        {!bettingWindow.isOpen && (
          <div role="alert" aria-live="polite" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Veikkausaika ei ole käynnissä. Veikkauksia ei voi muokata tällä hetkellä.
          </div>
        )}

        {round.matchPairs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="text-gray-400">Ei ottelupareja tässä kierroksessa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {round.matchPairs.map((matchPair) => {
              const score = scores[matchPair.id] ?? { homeScore: DEFAULT_SCORE, awayScore: DEFAULT_SCORE };
              const isSaving = saving[matchPair.id] ?? false;
              const showOk = savedAt[matchPair.id] !== undefined;
              const saveError = saveErrors[matchPair.id];

              return (
                <div key={matchPair.id} className="rounded-xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-400">{formatDate(matchPair.matchDate)}</span>
                    <StatusIcon isSaving={isSaving} saveError={saveError} showOk={showOk} />
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 sm:hidden">
                    <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-center">
                      <p className="truncate text-sm font-medium text-gray-900">{matchPair.homeTeam}</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score.homeScore}
                        onChange={(e) => handleScoreChange(matchPair.id, "homeScore", e.target.value)}
                        placeholder={DEFAULT_SCORE}
                        disabled={!bettingWindow.isOpen}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2 rounded-xl bg-gray-50 p-3 text-center">
                      <p className="truncate text-sm font-medium text-gray-900">{matchPair.awayTeam}</p>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score.awayScore}
                        onChange={(e) => handleScoreChange(matchPair.id, "awayScore", e.target.value)}
                        placeholder={DEFAULT_SCORE}
                        disabled={!bettingWindow.isOpen}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-center text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="mt-3 hidden items-center gap-3 sm:flex">
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                      <span className="truncate font-medium text-gray-900">{matchPair.homeTeam}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score.homeScore}
                        onChange={(e) => handleScoreChange(matchPair.id, "homeScore", e.target.value)}
                        placeholder={DEFAULT_SCORE}
                        disabled={!bettingWindow.isOpen}
                        className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-center text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                    <span className="shrink-0 font-bold text-gray-400">–</span>
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score.awayScore}
                        onChange={(e) => handleScoreChange(matchPair.id, "awayScore", e.target.value)}
                        placeholder={DEFAULT_SCORE}
                        disabled={!bettingWindow.isOpen}
                        className="w-12 rounded-lg border border-gray-300 px-1 py-1.5 text-center text-sm font-semibold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="truncate font-medium text-gray-900">{matchPair.awayTeam}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
