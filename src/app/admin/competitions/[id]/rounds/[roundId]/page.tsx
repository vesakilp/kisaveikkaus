"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import { JsonInfoPopup } from "@/components/JsonInfoPopup";
import { formatDateTimeInFinland } from "@/lib/timezone";

interface MatchPair {
  id: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
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
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fi-FI", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const emptyMatch = { homeTeam: "", awayTeam: "", matchDate: "" };

export default function RoundPage() {
  const params = useParams();
  const roundIdParam = params.roundId;
  const competitionIdParam = params.id;
  const roundId = Array.isArray(roundIdParam) ? roundIdParam[0] : roundIdParam;
  const competitionId = Array.isArray(competitionIdParam) ? competitionIdParam[0] : competitionIdParam;

  const [round, setRound] = useState<Round | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [matchForm, setMatchForm] = useState(emptyMatch);
  const [saving, setSaving] = useState(false);
  const [editMatchId, setEditMatchId] = useState<number | null>(null);
  const [editMatch, setEditMatch] = useState(emptyMatch);
  const [jsonError, setJsonError] = useState("");
  const [jsonSuccess, setJsonSuccess] = useState("");
  const [showJsonInfo, setShowJsonInfo] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog } = useConfirm();

  const [resultMatchId, setResultMatchId] = useState<number | null>(null);
  const [resultForm, setResultForm] = useState({ actualHomeScore: "", actualAwayScore: "" });
  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    if (!roundId) {
      setRound(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/api/rounds/${roundId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setRound(data))
      .catch(() => setRound(null))
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

  const handleSaveResult = async (matchId: number) => {
    const ok = await confirm("Tallenna tulos", `Tallennetaanko tulos ${resultForm.actualHomeScore}–${resultForm.actualAwayScore}?`);
    if (!ok) return;
    setSavingResult(true);
    await fetch(`/api/match-pairs/${matchId}/result`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        actualHomeScore: resultForm.actualHomeScore === "" ? null : Number(resultForm.actualHomeScore),
        actualAwayScore: resultForm.actualAwayScore === "" ? null : Number(resultForm.actualAwayScore),
      }),
    });
    setResultMatchId(null);
    setSavingResult(false);
    refresh();
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setJsonError("");
    setJsonSuccess("");
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
      const response = await fetch(`/api/rounds/${roundId}/match-pairs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Virhe otteluparien tuonnissa");
      }
      setJsonSuccess(`Tuonti valmis: luotiin ${result.created}, päivitettiin ${result.updated}, ennallaan ${result.unchanged}.`);
      if (fileRef.current) fileRef.current.value = "";
      refresh();
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : "Virheellinen JSON-tiedosto");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-gray-400">Ladataan…</p></div>;
  if (!round) return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-red-500">Kierrosta ei löydy</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <JsonInfoPopup isOpen={showJsonInfo} onClose={() => setShowJsonInfo(false)} />

      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center gap-3">
            <Link href={`/admin/competitions/${competitionId}`} className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← {round.competition.name}
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{round.name}</h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Veikkaus: {formatDateTimeInFinland(round.bettingStart)} – {formatDateTimeInFinland(round.bettingEnd)}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Otteluparit</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <label className="cursor-pointer">
              <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto">
                📁 Tuo JSON
              </span>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleJsonFile} />
            </label>
            <button onClick={() => setShowJsonInfo(true)} className="rounded-lg px-2 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50 sm:text-xs">
              ℹ️ JSON-ohje
            </button>
            <button
              onClick={() => setShowMatchForm(true)}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
            >
              + Lisää ottelu
            </button>
          </div>
        </div>

        {jsonError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            ⚠️ {jsonError}
          </div>
        )}
        {jsonSuccess && (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            ✅ {jsonSuccess}
          </div>
        )}

        {showMatchForm && (
          <form onSubmit={handleAddMatch} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Lisää ottelu</h3>
            <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kotijoukkue</label>
                <input
                  autoFocus
                  type="text"
                  value={matchForm.homeTeam}
                  onChange={(e) => setMatchForm({ ...matchForm, homeTeam: e.target.value })}
                  placeholder="Esim. Suomi"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Vierasjoukkue</label>
                <input
                  type="text"
                  value={matchForm.awayTeam}
                  onChange={(e) => setMatchForm({ ...matchForm, awayTeam: e.target.value })}
                  placeholder="Esim. Ruotsi"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-sm font-medium text-gray-700">Ottelun päivämäärä</label>
              <input
                type="date"
                value={matchForm.matchDate}
                onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-auto"
                required
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button type="button" onClick={() => { setShowMatchForm(false); setMatchForm(emptyMatch); }} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto">
                Peruuta
              </button>
            </div>
          </form>
        )}

        {round.matchPairs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="mb-3 text-gray-400">Ei ottelupareja vielä</p>
            <button onClick={() => setShowMatchForm(true)} className="text-sm text-blue-600 hover:underline">Lisää ensimmäinen ottelu →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {round.matchPairs.map((match) => (
              <div key={match.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
                {editMatchId === match.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        autoFocus
                        value={editMatch.homeTeam}
                        onChange={(e) => setEditMatch({ ...editMatch, homeTeam: e.target.value })}
                        placeholder="Kotijoukkue"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                      <input
                        value={editMatch.awayTeam}
                        onChange={(e) => setEditMatch({ ...editMatch, awayTeam: e.target.value })}
                        placeholder="Vierasjoukkue"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        type="date"
                        value={editMatch.matchDate}
                        onChange={(e) => setEditMatch({ ...editMatch, matchDate: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-auto"
                      />
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button onClick={() => handleSaveMatch(match.id)} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto">Tallenna</button>
                        <button onClick={() => setEditMatchId(null)} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">Peruuta</button>
                      </div>
                    </div>
                  </div>
                ) : resultMatchId === match.id ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">Syötä lopputulos: {match.homeTeam} – {match.awayTeam}</p>
                    <div className="flex items-center gap-3">
                      <input
                        autoFocus
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={resultForm.actualHomeScore}
                        onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setResultForm({ ...resultForm, actualHomeScore: e.target.value }); }}
                        placeholder="–"
                        className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm font-semibold focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                      <span className="font-bold text-gray-400">–</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={resultForm.actualAwayScore}
                        onChange={(e) => { if (/^\d{0,2}$/.test(e.target.value)) setResultForm({ ...resultForm, actualAwayScore: e.target.value }); }}
                        placeholder="–"
                        className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-center text-sm font-semibold focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button onClick={() => handleSaveResult(match.id)} disabled={savingResult} className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-3 py-2 text-sm text-white transition-colors hover:bg-green-700 disabled:opacity-50 sm:w-auto">
                        {savingResult ? "Tallennetaan…" : "Tallenna tulos"}
                      </button>
                      <button onClick={() => setResultMatchId(null)} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">Peruuta</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-400">{formatDate(match.matchDate)}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900">
                        <span className="truncate">{match.homeTeam}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="truncate">{match.awayTeam}</span>
                      </div>
                      {match.actualHomeScore !== null && match.actualAwayScore !== null && (
                        <p className="mt-1 text-sm font-semibold text-green-700">
                          Tulos: {match.actualHomeScore}–{match.actualAwayScore}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      <button
                        onClick={() => {
                          setResultMatchId(match.id);
                          setResultForm({
                            actualHomeScore: match.actualHomeScore !== null ? String(match.actualHomeScore) : "",
                            actualAwayScore: match.actualAwayScore !== null ? String(match.actualAwayScore) : "",
                          });
                        }}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-50 sm:w-auto"
                      >
                        {match.actualHomeScore !== null ? "Muokkaa tulosta" : "Syötä tulos"}
                      </button>
                      <button
                        onClick={() => {
                          setEditMatchId(match.id);
                          setEditMatch({ homeTeam: match.homeTeam, awayTeam: match.awayTeam, matchDate: toDateInput(match.matchDate) });
                        }}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDeleteMatch(match.id, `${match.homeTeam} – ${match.awayTeam}`)}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:w-auto"
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
