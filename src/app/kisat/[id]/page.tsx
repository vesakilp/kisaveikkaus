"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Round {
  id: number;
  name: string;
  _count: { matchPairs: number };
  matchPairs: { matchDate: string }[];
}

interface Competition {
  id: number;
  name: string;
  rounds: Round[];
}

export default function CompetitionPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    fetch(`/api/competitions/${competitionId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Kisaa ei voitu ladata");
        return r.json();
      })
      .then((data) => setCompetition(data))
      .catch(() => setError("Kisaa ei voitu ladata. Yritä päivittää sivu."))
      .finally(() => setLoading(false));
  }, [competitionId]);

  useEffect(() => {
    const intervalId = setInterval(() => setCurrentTime(Date.now()), 30_000);
    return () => clearInterval(intervalId);
  }, []);

  const activeRounds =
    competition?.rounds.filter((round) => round.matchPairs.some((matchPair) => new Date(matchPair.matchDate).getTime() > currentTime)) || [];
  const pastRounds =
    competition?.rounds.filter((round) => !round.matchPairs.some((matchPair) => new Date(matchPair.matchDate).getTime() > currentTime)) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2">
            <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← Takaisin
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? "Ladataan..." : competition?.name || "Kisa"}
          </h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {loading ? (
          <p className="py-12 text-center text-gray-400">Ladataan…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        ) : !competition ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="text-gray-400">Kisaa ei löytynyt</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pistetaulukko linkki */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <Link
                href={`/kisat/${competition.id}/pistetaulukko`}
                className="flex items-center justify-between gap-3 transition-colors hover:text-blue-600"
              >
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">🏆 Pistetaulukko</h2>
                  <p className="text-sm text-gray-500">Katso kilpailun tulokset</p>
                </div>
                <span className="text-2xl">→</span>
              </Link>
            </div>

            {/* Käynnissä olevat kierrokset */}
            {activeRounds.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Käynnissä olevat kierrokset</h2>
                <div className="space-y-3">
                  {activeRounds.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900">{round.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Veikkaus avoinna ottelun alkuun asti (Suomen aikaa)
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {round._count.matchPairs} otteluparia
                          </p>
                        </div>
                        <Link
                          href={`/kisat/${competition.id}/kierrokset/${round.id}`}
                          className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
                        >
                          Veikkaa →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Päättyneet kierrokset */}
            {pastRounds.length > 0 && (
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900">Päättyneet kierrokset</h2>
                <div className="space-y-3">
                  {pastRounds.map((round) => (
                    <div
                      key={round.id}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-700">{round.name}</h3>
                          <p className="mt-1 text-xs text-gray-500">
                            Kaikki kierroksen ottelut ovat alkaneet
                          </p>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {round._count.matchPairs} otteluparia
                          </p>
                        </div>
                        <Link
                          href={`/kisat/${competition.id}/kierrokset/${round.id}`}
                          className="inline-flex w-full shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                        >
                          Näytä →
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeRounds.length === 0 && pastRounds.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
                <p className="text-gray-400">Ei kierroksia tällä kisalla</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
