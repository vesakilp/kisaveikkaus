"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDateTimeInFinland } from "@/lib/timezone";

interface Round {
  id: number;
  name: string;
  bettingStart: string;
  bettingEnd: string;
  _count: { matchPairs: number };
}

interface Competition {
  id: number;
  name: string;
  rounds: Round[];
}

export default function KisatPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/competitions/active")
      .then((r) => {
        if (!r.ok) throw new Error("Kisoja ei voitu ladata");
        return r.json();
      })
      .then((data) => setCompetitions(Array.isArray(data) ? data : []))
      .catch(() => setError("Kisoja ei voitu ladata. Yritä päivittää sivu."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <h1 className="text-xl font-bold text-gray-900">Käynnissä olevat kisat</h1>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {loading ? (
          <p className="py-12 text-center text-gray-400">Ladataan…</p>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {error}
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="text-gray-400">Ei käynnissä olevia kisoja tällä hetkellä</p>
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((competition) => (
              <div
                key={competition.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-bold text-gray-900">{competition.name}</h2>
                  <Link
                    href={`/kisat/${competition.id}/pistetaulukko`}
                    className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    🏆 Pistetaulukko
                  </Link>
                </div>
                <div className="space-y-3">
                  {competition.rounds.map((round) => (
                    <div
                      key={round.id}
                      className="flex flex-col gap-3 rounded-xl bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{round.name}</p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          Veikkaus päättyy: {formatDateTimeInFinland(round.bettingEnd)}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">{round._count.matchPairs} otteluparia</p>
                      </div>
                      <Link
                        href={`/kisat/${competition.id}/kierrokset/${round.id}`}
                        className="inline-flex w-full shrink-0 items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
                      >
                        Veikkaa →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
