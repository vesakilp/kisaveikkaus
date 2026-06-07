"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import { JsonInfoPopup } from "@/components/JsonInfoPopup";
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

function toDateInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fi-FI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const emptyMatch = { homeTeam: "", awayTeam: "", matchDate: "" };

export default function RoundPage() {
  const params = useParams();
  const roundId = params.roundId as string;
  const competitionId = params.id as string;

  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState(emptyMatch);
  const [saving, setSaving] = useState(false);
  const [editMatchId, setEditMatchId] = useState<number | null>(null);
  const [editMatch, setEditMatch] = useState(emptyMatch);
  const [jsonError, setJsonError] = useState("");
  const [showJsonInfo, setShowJsonInfo] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    fetch(`/api/rounds/${roundId}`)
      .then((r) => r.json())
      .then((data) => setRound(data))
      .finally(() => setLoading(false));
  }, [roundId, refreshCount]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm("Lisää ottelu", `Lisätäänkö ottelu ${matchForm.homeTeam} – ${matchForm.awayTeam}?`);
    if (!ok) return;
    setSaving(true);
    await fetch(`/api/rounds/${roundId}/match-pairs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(matchForm),
    });
    setMatchForm(emptyMatch);
    setShowMatchForm(false);
    setSaving(false);
    refresh();
  };

  const handleSaveMatch = async (matchId: number) => {
    const ok = await confirm("Muokkaa ottelua", `Tallennetaanko muutokset ottelulle ${editMatch.homeTeam} – ${editMatch.awayTeam}?`);
    if (!ok) return;
    await fetch(`/api/match-pairs/${matchId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editMatch),
    });
    setEditMatchId(null);
    refresh();
  };

  const handleDeleteMatch = async (matchId: number, label: string) => {
    const ok = await confirm("Poista ottelu", `Poistetaanko ottelu ${label}?`, true);
    if (!ok) return;
    await fetch(`/api/match-pairs/${matchId}`, { method: "DELETE" });
    refresh();
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setJsonError("");
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("JSON täytyy olla taulukko");
      for (const item of parsed) {
        if (!item.homeTeam || !item.awayTeam || !item.matchDate) {
          throw new Error("Jokaisella ottelulla täytyy olla homeTeam, awayTeam ja matchDate");
        }
      }
      const ok = await confirm("Tuo otteluparit JSON:sta", `Tuodaanko ${parsed.length} otteluparia?`);
      if (!ok) {
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      await fetch(`/api/rounds/${roundId}/match-pairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Virheellinen JSON-tiedosto");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Ladataan…</p></div>;
  if (!round) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-red-500">Kierrosta ei löydy</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <JsonInfoPopup isOpen={showJsonInfo} onClose={() => setShowJsonInfo(false)} />

      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <Link href={`/admin/competitions/${competitionId}`} className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← {round.competition.name}
          </Link>
        </div>
        <div className="mt-2">
          <h1 className="text-2xl font-bold text-gray-900">{round.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Veikkaus: {formatDateTimeInFinland(round.bettingStart)} – {formatDateTimeInFinland(round.bettingEnd)}
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-lg font-semibold text-gray-900">Otteluparit</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="relative cursor-pointer">
              <span className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors text-sm inline-flex items-center gap-1.5">
                📁 Tuo JSON
              </span>
              <input ref={fileRef} type="file" accept=".json,application/json" className="absolute inset-0 opacity-0 w-0 h-0" onChange={handleJsonFile} />
            </label>
            <button onClick={() => setShowJsonInfo(true)} className="text-xs text-blue-600 hover:underline px-2 py-1">
              ℹ️ JSON-ohje
            </button>
            <button
              onClick={() => setShowMatchForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              + Lisää ottelu
            </button>
          </div>
        </div>

        {jsonError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-4">
            ⚠️ {jsonError}
          </div>
        )}

        {showMatchForm && (
          <form onSubmit={handleAddMatch} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Lisää ottelu</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kotijoukkue</label>
                <input
                  autoFocus
                  type="text"
                  value={matchForm.homeTeam}
                  onChange={(e) => setMatchForm({ ...matchForm, homeTeam: e.target.value })}
                  placeholder="Esim. Suomi"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vierasjoukkue</label>
                <input
                  type="text"
                  value={matchForm.awayTeam}
                  onChange={(e) => setMatchForm({ ...matchForm, awayTeam: e.target.value })}
                  placeholder="Esim. Ruotsi"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ottelun päivämäärä</label>
              <input
                type="date"
                value={matchForm.matchDate}
                onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button type="button" onClick={() => { setShowMatchForm(false); setMatchForm(emptyMatch); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                Peruuta
              </button>
            </div>
          </form>
        )}

        {round.matchPairs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 mb-3">Ei ottelupareja vielä</p>
            <button onClick={() => setShowMatchForm(true)} className="text-blue-600 text-sm hover:underline">Lisää ensimmäinen ottelu →</button>
          </div>
        ) : (
          <div className="space-y-2">
            {round.matchPairs.map((m) => (
              <div key={m.id} className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
                {editMatchId === m.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        autoFocus
                        value={editMatch.homeTeam}
                        onChange={(e) => setEditMatch({ ...editMatch, homeTeam: e.target.value })}
                        placeholder="Kotijoukkue"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        value={editMatch.awayTeam}
                        onChange={(e) => setEditMatch({ ...editMatch, awayTeam: e.target.value })}
                        placeholder="Vierasjoukkue"
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={editMatch.matchDate}
                        onChange={(e) => setEditMatch({ ...editMatch, matchDate: e.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button onClick={() => handleSaveMatch(m.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Tallenna</button>
                      <button onClick={() => setEditMatchId(null)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Peruuta</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-900 truncate">{m.homeTeam}</span>
                      <span className="text-gray-400 text-sm shrink-0">vs</span>
                      <span className="font-medium text-gray-900 truncate">{m.awayTeam}</span>
                      <span className="text-xs text-gray-400 shrink-0 ml-auto">{formatDate(m.matchDate)}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditMatchId(m.id); setEditMatch({ homeTeam: m.homeTeam, awayTeam: m.awayTeam, matchDate: toDateInput(m.matchDate) }); }}
                        className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(m.id, `${m.homeTeam} – ${m.awayTeam}`)}
                        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Poista
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
