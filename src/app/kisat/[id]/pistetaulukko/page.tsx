"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface LeaderboardEntry {
  userId: number;
  displayName: string;
  points: number;
}

interface LeaderboardData {
  competition: { id: number; name: string };
  leaderboard: LeaderboardEntry[];
}

interface MatchPairPrediction {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  actualHomeScore: number;
  actualAwayScore: number;
  prediction: { homeScore: number | null; awayScore: number | null } | null;
  points: { total: number; outcome: boolean; homeGoals: boolean; awayGoals: boolean; bothGoals: boolean };
}

interface PlayerPredictionsRound {
  id: number;
  name: string;
  matchPairs: MatchPairPrediction[];
}

interface PlayerPredictionsData {
  user: { id: number; displayName: string };
  competition: { id: number; name: string };
  rounds: PlayerPredictionsRound[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function scoreDisplay(score: number | null | undefined): string {
  return score !== null && score !== undefined ? String(score) : "–";
}

function PlayerPredictionsPanel({
  competitionId,
  userId,
  displayName,
  onClose,
}: {
  competitionId: string;
  userId: number;
  displayName: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<PlayerPredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/competitions/${competitionId}/players/${userId}/predictions`)
      .then((r) => {
        if (r.status === 401) throw new Error("auth");
        if (!r.ok) throw new Error("Veikkauksia ei voitu ladata");
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) =>
        setError(
          e.message === "auth"
            ? "Kirjaudu sisään nähdäksesi muiden veikkaukset."
            : "Veikkauksia ei voitu ladata. Yritä uudelleen."
        )
      )
      .finally(() => setLoading(false));
  }, [competitionId, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <h2 className="font-bold text-gray-900">{displayName} – veikkaukset</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Sulje"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="py-8 text-center text-gray-400">Ladataan…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-500">{error}</p>
          ) : !data || data.rounds.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Ei veikkauksia päätetyistä otteluista</p>
          ) : (
            <div className="space-y-5">
              {data.rounds.map((round) => (
                <div key={round.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{round.name}</h3>
                  <div className="space-y-2">
                    {round.matchPairs.map((mp) => {
                      const pts = mp.points;
                      const predHome = mp.prediction?.homeScore ?? null;
                      const predAway = mp.prediction?.awayScore ?? null;
                      const hasPrediction = mp.prediction !== null;

                      const homeClass = pts.homeGoals
                        ? "bg-green-100 border-green-400 text-green-800"
                        : "bg-gray-100 border-gray-300 text-gray-700";
                      const awayClass = pts.awayGoals
                        ? "bg-green-100 border-green-400 text-green-800"
                        : "bg-gray-100 border-gray-300 text-gray-700";

                      return (
                        <div key={mp.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400">{formatDate(mp.matchDate)}</span>
                            {hasPrediction && (
                              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                                {pts.total} {pts.total === 1 ? "piste" : "pistettä"}
                              </span>
                            )}
                          </div>

                          {/* Mobile layout */}
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                            <div className="space-y-1 text-center">
                              <p className="truncate text-xs font-medium text-gray-700">{mp.homeTeam}</p>
                              <div className={`rounded-lg border px-2 py-1.5 text-sm font-semibold ${hasPrediction ? homeClass : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                                {hasPrediction ? scoreDisplay(predHome) : "–"}
                              </div>
                            </div>
                            <div className="space-y-1 text-center">
                              <p className="truncate text-xs font-medium text-gray-700">{mp.awayTeam}</p>
                              <div className={`rounded-lg border px-2 py-1.5 text-sm font-semibold ${hasPrediction ? awayClass : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                                {hasPrediction ? scoreDisplay(predAway) : "–"}
                              </div>
                            </div>
                          </div>

                          {/* Desktop layout */}
                          <div className="mt-2 hidden items-center gap-2 sm:flex">
                            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
                              <span className="truncate text-sm font-medium text-gray-900">{mp.homeTeam}</span>
                              <div className={`w-10 rounded-lg border px-1 py-1 text-center text-sm font-semibold ${hasPrediction ? homeClass : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                                {hasPrediction ? scoreDisplay(predHome) : "–"}
                              </div>
                            </div>
                            <span className="shrink-0 font-bold text-gray-400">–</span>
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <div className={`w-10 rounded-lg border px-1 py-1 text-center text-sm font-semibold ${hasPrediction ? awayClass : "border-gray-200 bg-gray-50 text-gray-400"}`}>
                                {hasPrediction ? scoreDisplay(predAway) : "–"}
                              </div>
                              <span className="truncate text-sm font-medium text-gray-900">{mp.awayTeam}</span>
                            </div>
                          </div>

                          {/* Actual result */}
                          <div className="mt-2 border-t border-gray-100 pt-2">
                            <span className="text-xs text-gray-500">
                              Tulos:{" "}
                              <span className="font-semibold text-gray-800">
                                {mp.actualHomeScore}–{mp.actualAwayScore}
                              </span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<{ userId: number; displayName: string } | null>(null);

  useEffect(() => {
    fetch(`/api/competitions/${competitionId}/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Pistetaulukkoa ei voitu ladata");
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => setError("Pistetaulukkoa ei voitu ladata. Yritä päivittää sivu."))
      .finally(() => setLoading(false));
  }, [competitionId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {data && (
            <div className="mb-2">
              <Link href="/kisat" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
                ← {data.competition.name}
              </Link>
            </div>
          )}
          <h1 className="text-2xl font-bold text-gray-900">Pistetaulukko</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {loading ? (
          <p className="py-12 text-center text-gray-400">Ladataan…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        ) : !data || data.leaderboard.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="text-gray-400">Pisteitä ei ole vielä kertynyt</p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs text-gray-400">Paina pelaajan nimeä nähdäksesi hänen veikkauksensa päätetyistä otteluista.</p>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pelaaja</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">Pisteet</th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry, index) => {
                    const isTop = index === 0;
                    return (
                      <tr
                        key={entry.userId}
                        className={`border-b border-gray-100 last:border-0 ${isTop ? "bg-yellow-50" : ""}`}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-500">
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="font-medium text-gray-900 underline-offset-2 hover:text-blue-600 hover:underline"
                            onClick={() => setSelectedPlayer({ userId: entry.userId, displayName: entry.displayName })}
                          >
                            {entry.displayName}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{entry.points}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {selectedPlayer && (
        <PlayerPredictionsPanel
          competitionId={competitionId}
          userId={selectedPlayer.userId}
          displayName={selectedPlayer.displayName}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </div>
  );
}
