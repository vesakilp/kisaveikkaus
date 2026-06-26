"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDateTimeInFinland, toDatetimeLocalInFinland } from "@/lib/timezone";

interface Round {
  id: number;
  name: string;
  additionalInfo: string | null;
  bettingStart: string;
  _count: { matchPairs: number };
}

interface Competition {
  id: number;
  name: string;
  rounds: Round[];
}

const emptyRound = { name: "", additionalInfo: "", bettingStart: "" };

export default function CompetitionPage() {
  const params = useParams();
  const id = params.id as string;

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [roundForm, setRoundForm] = useState(emptyRound);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editRoundId, setEditRoundId] = useState<number | null>(null);
  const [editRound, setEditRound] = useState(emptyRound);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    fetch(`/api/competitions/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Kisaa ei voitu ladata");
        return r.json();
      })
      .then((data) => setCompetition(data))
      .catch(() => setError("Kisaa ei voitu ladata. Yritä päivittää sivu."))
      .finally(() => setLoading(false));
  }, [id, refreshCount]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    const ok = await confirm("Muokkaa kisaa", `Tallennetaanko nimi "${nameInput}"?`);
    if (!ok) return;
    await fetch(`/api/competitions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput }),
    });
    setEditingName(false);
    refresh();
  };

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!roundForm.name.trim()) {
      setError("Kierroksen nimi on pakollinen");
      return;
    }

    if (!roundForm.bettingStart) {
      setError("Veikkauksen alkamisaika on pakollinen");
      return;
    }

    const ok = await confirm("Luo kierros", `Luodaanko kierros "${roundForm.name}"?`);
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/competitions/${id}/rounds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roundForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Kierroksen tallennus epäonnistui");
      }
      setRoundForm(emptyRound);
      setShowRoundForm(false);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kierroksen tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRound = async (roundId: number) => {
    const ok = await confirm("Muokkaa kierrosta", `Tallennetaanko muutokset kierrokselle "${editRound.name}"?`);
    if (!ok) return;
    setError("");
    const res = await fetch(`/api/rounds/${roundId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editRound),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Kierroksen tallennus epäonnistui");
      return;
    }
    setEditRoundId(null);
    refresh();
  };

  const handleDeleteRound = async (roundId: number, name: string) => {
    const ok = await confirm("Poista kierros", `Poistetaanko kierros "${name}" kaikkine ottelupareineen?`, true);
    if (!ok) return;
    await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
    refresh();
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-gray-400">Ladataan…</p></div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-red-500">{error}</p></div>;
  }

  if (!competition) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-red-500">Kisaa ei löydy</p></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center gap-3">
            <Link href="/admin" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← Kaikki kisat
            </Link>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {editingName ? (
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-lg font-bold focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:flex-1"
                />
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button onClick={handleSaveName} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto">Tallenna</button>
                  <button onClick={() => setEditingName(false)} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">Peruuta</button>
                </div>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
                <button onClick={() => { setEditingName(true); setNameInput(competition.name); }} className="inline-flex items-center rounded-lg px-2 py-1 text-sm text-gray-400 transition-colors hover:bg-blue-50 hover:text-blue-600">
                  ✏️ Muokkaa
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Mestariveikkaus</h2>
              <p className="mt-1 text-sm text-gray-500">
                Hallitse voittajaveikkauksen aikaa, vaihtoehtoja ja oikeaa voittajaa.
              </p>
            </div>
            <Link
              href={`/admin/competitions/${id}/mestariveikkaus`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 sm:w-auto"
            >
              Avaa mestariveikkaus
            </Link>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Paras pelaaja -veikkaus</h2>
              <p className="mt-1 text-sm text-gray-500">
                Hallitse paras pelaaja -veikkauksen aikaa, pelaajia ja oikeaa vastausta.
              </p>
            </div>
            <Link
              href={`/admin/competitions/${id}/paras-pelaaja`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 sm:w-auto"
            >
              Avaa paras pelaaja
            </Link>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Kierrokset</h2>
          <button
            onClick={() => setShowRoundForm(true)}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            + Uusi kierros
          </button>
        </div>

        {showRoundForm && (
          <form onSubmit={handleCreateRound} noValidate className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h3 className="mb-4 text-base font-semibold text-gray-900">Uusi kierros</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Kierroksen nimi</label>
                <input
                  autoFocus
                  type="text"
                  value={roundForm.name}
                  onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                  placeholder="Esim. Alkulohko A"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Veikkaus alkaa</label>
                <input
                  type="datetime-local"
                  value={roundForm.bettingStart}
                  onChange={(e) => setRoundForm({ ...roundForm, bettingStart: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-auto"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Lisätieto (valinnainen)</label>
                <textarea
                  value={roundForm.additionalInfo ?? ""}
                  onChange={(e) => setRoundForm({ ...roundForm, additionalInfo: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button type="submit" disabled={saving} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto">
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button type="button" onClick={() => { setShowRoundForm(false); setRoundForm(emptyRound); }} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto">
                Peruuta
              </button>
            </div>
          </form>
        )}

        {competition.rounds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="mb-3 text-gray-400">Ei kierroksia vielä</p>
            <button onClick={() => setShowRoundForm(true)} className="text-sm text-blue-600 hover:underline">Luo ensimmäinen kierros →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {competition.rounds.map((round) => (
              <div key={round.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                {editRoundId === round.id ? (
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={editRound.name}
                      onChange={(e) => setEditRound({ ...editRound, name: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-500">Veikkaus alkaa</label>
                        <input type="datetime-local" value={editRound.bettingStart} onChange={(e) => setEditRound({ ...editRound, bettingStart: e.target.value })} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">Lisätieto (valinnainen)</label>
                      <textarea
                        value={editRound.additionalInfo ?? ""}
                        onChange={(e) => setEditRound({ ...editRound, additionalInfo: e.target.value })}
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                      />
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button onClick={() => handleSaveRound(round.id)} className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto">Tallenna</button>
                      <button onClick={() => setEditRoundId(null)} className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto">Peruuta</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900">{round.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Veikkaus alkaa: {formatDateTimeInFinland(round.bettingStart)}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{round._count.matchPairs} otteluparia</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      <Link href={`/admin/competitions/${id}/rounds/${round.id}`} className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto">
                        Avaa
                      </Link>
                      <button onClick={() => { setEditRoundId(round.id); setEditRound({ name: round.name, additionalInfo: round.additionalInfo ?? "", bettingStart: toDatetimeLocalInFinland(round.bettingStart) }); }} className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto">
                        Muokkaa
                      </button>
                      <button onClick={() => handleDeleteRound(round.id, round.name)} className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 sm:w-auto">
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
