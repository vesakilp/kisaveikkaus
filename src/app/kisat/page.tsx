"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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

  useEffect(() => {
    fetch("/api/competitions/active")
      .then((r) => r.json())
      .then((data) => setCompetitions(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Käynnissä olevat kisat</h1>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-gray-400 text-center py-12">Ladataan…</p>
        ) : competitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400">Ei käynnissä olevia kisoja tällä hetkellä</p>
          </div>
        ) : (
          <div className="space-y-4">
            {competitions.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5"
              >
                <h2 className="text-lg font-bold text-gray-900 mb-3">{c.name}</h2>
                <div className="space-y-2">
                  {c.rounds.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-4 bg-gray-50 rounded-xl px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{r.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Veikkaus päättyy: {formatDateTimeInFinland(r.bettingEnd)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {r._count.matchPairs} otteluparia
                        </p>
                      </div>
                      <Link
                        href={`/kisat/${c.id}/kierrokset/${r.id}`}
                        className="shrink-0 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
