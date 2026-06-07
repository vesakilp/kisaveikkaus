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

export default function LeaderboardPage() {
  const params = useParams();
  const competitionId = params.id as string;

  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
                      <td className="px-4 py-3 font-medium text-gray-900">{entry.displayName}</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{entry.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
