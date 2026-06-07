"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
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
const SCORE_INPUT_PATTERN = new RegExp(`^\\d{0,${MAX_SCORE_DIGITS}}$`);

function scoreToString(score: number | null | undefined): string {
  return score !== null && score !== undefined ? String(score) : "";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function RoundPredictionPage() {
  const params = useParams();
  const roundId = params.roundId as string;

  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  // scores[matchPairId] = { homeScore: string, awayScore: string }
  const [scores, setScores] = useState<Record<number, { homeScore: string; awayScore: string }>>({});
  // savedAt[matchPairId] = timestamp when saved (for showing ok icon)
  const [savedAt, setSavedAt] = useState<Record<number, number>>({});
  // saving[matchPairId] = true when request is in flight
  const [saving, setSaving] = useState<Record<number, boolean>>({});

  // Track timeouts for hiding the ok icon
  const iconTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Track debounce timers per matchPairId
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  // Track save errors per matchPairId
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
    ]).then(([roundData, predictionsData]: [Round, Prediction[]]) => {
      setRound(roundData);
      const initial: Record<number, { homeScore: string; awayScore: string }> = {};
      for (const mp of roundData.matchPairs ?? []) {
        const pred = predictionsData.find((p) => p.matchPairId === mp.id);
        initial[mp.id] = {
          homeScore: scoreToString(pred?.homeScore),
          awayScore: scoreToString(pred?.awayScore),
        };
      }
      setScores(initial);
    }).catch(() => setRound(null)).finally(() => setLoading(false));
  }, [roundId]);

  // Cleanup timers on unmount
  useEffect(() => {
    const iconT = iconTimers.current;
    const saveT = saveTimers.current;
    return () => {
      for (const t of Object.values(iconT)) clearTimeout(t);
      for (const t of Object.values(saveT)) clearTimeout(t);
    };
  }, []);

  const savePrediction = useCallback(
    async (matchPairId: number, homeScore: string, awayScore: string) => {
      setSaving((prev) => ({ ...prev, [matchPairId]: true }));
      setSaveErrors((prev) => { const n = { ...prev }; delete n[matchPairId]; return n; });
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

        // Hide the ok icon after 3 seconds
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
    },
    []
  );

  const handleScoreChange = useCallback(
    (matchPairId: number, field: ScoreField, value: string) => {
      // Allow only empty string or non-negative integers up to MAX_SCORE_DIGITS
      if (value !== "" && !SCORE_INPUT_PATTERN.test(value)) return;

      setScores((prev) => {
        const current = prev[matchPairId] ?? { homeScore: "", awayScore: "" };
        const updated = { ...current, [field]: value };

        // Debounce auto-save: wait 500ms after last keystroke
        if (saveTimers.current[matchPairId]) clearTimeout(saveTimers.current[matchPairId]);
        saveTimers.current[matchPairId] = setTimeout(() => {
          savePrediction(matchPairId, updated.homeScore, updated.awayScore);
        }, 500);

        return { ...prev, [matchPairId]: updated };
      });
    },
    [savePrediction]
  );

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ladataan…</p>
      </div>
    );

  if (!round)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-red-500">Kierrosta ei löydy</p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Screen reader live region for save status announcements */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {Object.entries(saving).some(([, v]) => v) && "Tallennetaan…"}
        {Object.entries(saveErrors).map(([id, err]) => err && `Ottelu ${id}: ${err} `)}
      </div>
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <Link
            href="/kisat"
            className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
          >
            ← {round.competition.name}
          </Link>
        </div>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{round.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Veikkaus päättyy: {formatDateTimeInFinland(round.bettingEnd)}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <p className="text-sm text-gray-500 mb-4">
          Anna otteluiden tulokset. Tulokset tallentuvat automaattisesti.
        </p>

        {round.matchPairs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">Ei ottelupareja tässä kierroksessa</p>
          </div>
        ) : (
          <div className="space-y-3">
            {round.matchPairs.map((m) => {
              const s = scores[m.id] ?? { homeScore: "", awayScore: "" };
              const isSaving = saving[m.id] ?? false;
              const showOk = savedAt[m.id] !== undefined;
              const saveError = saveErrors[m.id];

              return (
                <div
                  key={m.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-4"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Date */}
                    <span className="text-xs text-gray-400 w-16 shrink-0">
                      {formatDate(m.matchDate)}
                    </span>

                    {/* Home team + score */}
                    <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                      <span className="font-medium text-gray-900 truncate">{m.homeTeam}</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={s.homeScore}
                        onChange={(e) => handleScoreChange(m.id, "homeScore", e.target.value)}
                        placeholder="–"
                        className="w-12 text-center border border-gray-300 rounded-lg px-1 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <span className="text-gray-400 font-bold shrink-0">–</span>

                    {/* Away score + team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={s.awayScore}
                        onChange={(e) => handleScoreChange(m.id, "awayScore", e.target.value)}
                        placeholder="–"
                        className="w-12 text-center border border-gray-300 rounded-lg px-1 py-1.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="font-medium text-gray-900 truncate">{m.awayTeam}</span>
                    </div>

                    {/* Save status icon */}
                    <div
                      className="w-6 shrink-0 flex items-center justify-center"
                      aria-label={isSaving ? "Tallennetaan" : saveError ? saveError : showOk ? "Tallennettu" : undefined}
                    >
                      {isSaving ? (
                        <svg
                          className="w-4 h-4 text-gray-300 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                          />
                        </svg>
                      ) : saveError ? (
                        <svg
                          className="w-4 h-4 text-red-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      ) : showOk ? (
                        <svg
                          className="w-4 h-4 text-green-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      ) : null}
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
