"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

interface LeaderboardEntry {
  userId: number;
  displayName: string;
  points: number;
  perfectPredictions: number;
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

interface ChampionBetInfo {
  prediction: { optionId: number; optionName: string } | null;
  earnedPoints: number;
  maxPoints: number;
  isResolved: boolean;
}

interface PlayerPredictionsData {
  user: { id: number; displayName: string };
  competition: { id: number; name: string };
  championBet: ChampionBetInfo | null;
  rounds: PlayerPredictionsRound[];
}

const MAX_FILENAME_PART_LENGTH = 64;
const DOWNLOAD_URL_REVOKE_DELAY_MS = 1_000;

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

function toCsvCell(value: string | number): string {
  const text = String(value);
  return `"${text.replaceAll("\"", "\"\"")}"`;
}

function sanitizeFilenamePart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-_\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_FILENAME_PART_LENGTH);
}

function PlayerPredictionsPanel({
  competitionId,
  userId,
  displayName,
  onClose,
  players,
  currentIndex,
  onNavigate,
}: {
  competitionId: string;
  userId: number;
  displayName: string;
  onClose: () => void;
  players: { userId: number; displayName: string }[];
  currentIndex: number;
  onNavigate: (index: number) => void;
}) {
  const [data, setData] = useState<PlayerPredictionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revokeUrlTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (!revokeUrlTimeoutRef.current) return;
      clearTimeout(revokeUrlTimeoutRef.current);
    };
  }, []);

  const hasExportRows = Boolean(
    data?.rounds.some((round) =>
      round.matchPairs.some((matchPair) => matchPair.actualHomeScore !== null && matchPair.actualAwayScore !== null)
    )
  );

  const downloadCsv = () => {
    if (!data) return;

    const rows: string[] = [];

    for (const round of data.rounds) {
      for (const matchPair of round.matchPairs) {
        if (matchPair.actualHomeScore === null || matchPair.actualAwayScore === null) continue;

        const prediction = matchPair.prediction
          ? `${scoreDisplay(matchPair.prediction.homeScore)}-${scoreDisplay(matchPair.prediction.awayScore)}`
          : "";
        const actualScore = `${scoreDisplay(matchPair.actualHomeScore)}-${scoreDisplay(matchPair.actualAwayScore)}`;

        rows.push(
          [
            toCsvCell(`${matchPair.homeTeam} - ${matchPair.awayTeam}`),
            toCsvCell(prediction),
            toCsvCell(actualScore),
            toCsvCell(matchPair.points.total),
          ].join(","),
        );
      }
    }

    if (rows.length === 0) return;

    const lines = [
      [
        toCsvCell("Ottelupari"),
        toCsvCell("Veikkaus"),
        toCsvCell("Tulos"),
        toCsvCell("Pisteet"),
      ].join(","),
      ...rows,
    ];

    const csvContent = `\uFEFF${lines.join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    const fileSafeDisplayName = sanitizeFilenamePart(displayName);
    const fallbackName = sanitizeFilenamePart("pelaaja");
    link.download = `veikkaukset-${fileSafeDisplayName || fallbackName}.csv`;
    link.click();
    if (revokeUrlTimeoutRef.current) clearTimeout(revokeUrlTimeoutRef.current);
    revokeUrlTimeoutRef.current = setTimeout(() => URL.revokeObjectURL(downloadUrl), DOWNLOAD_URL_REVOKE_DELAY_MS);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${displayName} – veikkaukset`}
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(currentIndex - 1)}
              disabled={currentIndex <= 0}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Edellinen pelaaja"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => onNavigate(currentIndex + 1)}
              disabled={currentIndex >= players.length - 1}
              className="rounded-full p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Seuraava pelaaja"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
          <h2 className="flex-1 truncate px-2 text-center font-bold text-gray-900">{displayName} – veikkaukset</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={downloadCsv}
              disabled={!data || !hasExportRows}
              className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Lataa tiedot
            </button>
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
        </div>

        <div className="p-4">
          {loading ? (
            <p className="py-8 text-center text-gray-400">Ladataan…</p>
          ) : error ? (
            <p className="py-8 text-center text-sm text-red-500">{error}</p>
          ) : !data || (data.rounds.length === 0 && !data.championBet) ? (
            <p className="py-8 text-center text-gray-400">Ei veikkauksia</p>
          ) : (
            <div className="space-y-5">
              {/* Champion betting section - show first if exists */}
              {data.championBet && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Mestariveikkaus
                  </h3>
                  <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900">Kisan voittaja</span>
                      {data.championBet.isResolved && (
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          data.championBet.earnedPoints > 0
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-50 text-gray-600"
                        }`}>
                          {data.championBet.earnedPoints > 0
                            ? `${data.championBet.earnedPoints} ${data.championBet.earnedPoints === 1 ? "piste" : "pistettä"}`
                            : `0 / ${data.championBet.maxPoints} pistettä`
                          }
                        </span>
                      )}
                      {!data.championBet.isResolved && data.championBet.prediction && (
                        <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                          {data.championBet.maxPoints} {data.championBet.maxPoints === 1 ? "piste" : "pistettä"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      {data.championBet.prediction ? (
                        <div className={`rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                          data.championBet.isResolved
                            ? data.championBet.earnedPoints > 0
                              ? "border-green-400 bg-green-50 text-green-800"
                              : "border-gray-300 bg-gray-50 text-gray-600"
                            : "border-blue-300 bg-blue-50 text-blue-800"
                        }`}>
                          {data.championBet.prediction.optionName}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center text-sm text-gray-400">
                          Ei veikkausta
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {data.rounds.map((round) => (
                <div key={round.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{round.name}</h3>
                  <div className="space-y-2">
                    {round.matchPairs.sort((a, b) => b.matchDate.localeCompare(a.matchDate)).map((mp) => {
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
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState<number>(0);

  const selectPlayerAtIndex = (index: number) => {
    if (!data) return;
    const player = data.leaderboard[index];
    if (!player) return;
    setSelectedPlayer({ userId: player.userId, displayName: player.displayName });
    setSelectedPlayerIndex(index);
  };
  const [isPointsInfoOpen, setIsPointsInfoOpen] = useState(false);
  const pointsDialogRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!isPointsInfoOpen) return;
    pointsDialogRef.current?.focus();
  }, [isPointsInfoOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          {data && (
            <div className="mb-2">
              <Link href={`/kisat/${data.competition.id}`} className="text-sm text-gray-400 transition-colors hover:text-gray-600">
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
            <p id="leaderboard-hint" className="mb-3 text-xs text-gray-400">Paina pelaajan nimeä nähdäksesi hänen veikkauksensa päätetyistä otteluista.</p>
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pelaaja</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <span className="inline-flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setIsPointsInfoOpen(true)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white text-[11px] font-bold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 sm:h-7 sm:w-7"
                          aria-label="Näytä pisteiden laskentasäännöt"
                        >
                          <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8h.01M11 12h1v4h1m-1 6a10 10 0 100-20 10 10 0 000 20z" />
                          </svg>
                        </button>
                        Pisteet
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.leaderboard.map((entry, index) => {
                    const isTop = index === 0;
                    const hasTie =
                      (index > 0 && data.leaderboard[index - 1].points === entry.points) ||
                      (index < data.leaderboard.length - 1 && data.leaderboard[index + 1].points === entry.points);
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
                            className="block w-full text-left font-medium text-gray-900 underline-offset-2 hover:text-blue-600 hover:underline"
                            aria-describedby="leaderboard-hint"
                            onClick={() => selectPlayerAtIndex(index)}
                          >
                            <span className="block">{entry.displayName}</span>
                            {hasTie && (
                              <span
                                className="block text-xs font-normal text-gray-400"
                                aria-label={`${entry.perfectPredictions} kpl oikein veikattuja otteluita`}
                              >
                                ({entry.perfectPredictions} kpl oikein veikattuja)
                              </span>
                            )}
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

      {selectedPlayer && data && (
        <PlayerPredictionsPanel
          competitionId={competitionId}
          userId={selectedPlayer.userId}
          displayName={selectedPlayer.displayName}
          onClose={() => setSelectedPlayer(null)}
          players={data.leaderboard}
          currentIndex={selectedPlayerIndex}
          onNavigate={(index) => selectPlayerAtIndex(index)}
        />
      )}

      {isPointsInfoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          onClick={() => setIsPointsInfoOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Pisteiden määräytyminen"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl sm:p-6"
            ref={pointsDialogRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Tab") {
                const focusables = pointsDialogRef.current?.querySelectorAll<HTMLElement>(
                  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusables || focusables.length === 0) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                  return;
                }

                if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
              if (e.key !== "Escape") return;
              e.stopPropagation();
              setIsPointsInfoOpen(false);
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Miten pisteet määräytyvät?</h2>
              <button
                type="button"
                onClick={() => setIsPointsInfoOpen(false)}
                className="text-2xl leading-none text-gray-400 transition-colors hover:text-gray-600"
                aria-label="Sulje"
              >
                &times;
              </button>
            </div>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Oikea 1X2-tulos (kotivoitto/tasapeli/vierasvoitto): 1 piste</li>
              <li>• Oikea kotijoukkueen maalimäärä: 1 piste</li>
              <li>• Oikea vierasjoukkueen maalimäärä: 1 piste</li>
              <li>• Bonus, jos molemmat maalimäärät oikein: +1 piste</li>
            </ul>
            <p className="mt-3 text-sm font-medium text-gray-800">Maksimissaan 4 pistettä per ottelu.</p>
          </div>
        </div>
      )}
    </div>
  );
}
