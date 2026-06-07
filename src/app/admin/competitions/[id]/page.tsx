"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDateTimeInFinland, toDatetimeLocalInFinland } from "@/lib/timezone";

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

const emptyRound = { name: "", bettingStart: "", bettingEnd: "" };

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
  const [editRoundId, setEditRoundId] = useState<number | null>(null);
  const [editRound, setEditRound] = useState(emptyRound);
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    fetch(`/api/competitions/${id}`)
      .then((r) => r.json())
      .then((data) => setCompetition(data))
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
    const ok = await confirm("Luo kierros", `Luodaanko kierros "${roundForm.name}"?`);
    if (!ok) return;
    setSaving(true);
    await fetch(`/api/competitions/${id}/rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roundForm),
    });
    setRoundForm(emptyRound);
    setShowRoundForm(false);
    setSaving(false);
    refresh();
  };

  const handleSaveRound = async (roundId: number) => {
    const ok = await confirm("Muokkaa kierrosta", `Tallennetaanko muutokset kierrokselle "${editRound.name}"?`);
    if (!ok) return;
    await fetch(`/api/rounds/${roundId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editRound),
    });
    setEditRoundId(null);
    refresh();
  };

  const handleDeleteRound = async (roundId: number, name: string) => {
    const ok = await confirm("Poista kierros", `Poistetaanko kierros "${name}" kaikkine ottelupareineen?`, true);
    if (!ok) return;
    await fetch(`/api/rounds/${roundId}`, { method: "DELETE" });
    refresh();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400">Ladataan…</p></div>;
  if (!competition) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-red-500">Kisaa ei löydy</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">← Kaikki kisat</Link>
        </div>
        <div className="flex items-center gap-3 mt-2">
          {editingName ? (
            <div className="flex gap-2 items-center flex-1">
              <input
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleSaveName} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Tallenna</button>
              <button onClick={() => setEditingName(false)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Peruuta</button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900">{competition.name}</h1>
              <button onClick={() => { setEditingName(true); setNameInput(competition.name); }} className="text-sm text-gray-400 hover:text-blue-600 transition-colors px-2 py-1 rounded-lg hover:bg-blue-50">
                ✏️ Muokkaa
              </button>
            </>
          )}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Kierrokset</h2>
          <button
            onClick={() => setShowRoundForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
          >
            + Uusi kierros
          </button>
        </div>

        {showRoundForm && (
          <form onSubmit={handleCreateRound} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Uusi kierros</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kierroksen nimi</label>
                <input
                  autoFocus
                  type="text"
                  value={roundForm.name}
                  onChange={(e) => setRoundForm({ ...roundForm, name: e.target.value })}
                  placeholder="Esim. Alkulohko A"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veikkaus alkaa</label>
                  <input
                    type="datetime-local"
                    value={roundForm.bettingStart}
                    onChange={(e) => setRoundForm({ ...roundForm, bettingStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Veikkaus päättyy</label>
                  <input
                    type="datetime-local"
                    value={roundForm.bettingEnd}
                    onChange={(e) => setRoundForm({ ...roundForm, bettingEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50">
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button type="button" onClick={() => { setShowRoundForm(false); setRoundForm(emptyRound); }} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                Peruuta
              </button>
            </div>
          </form>
        )}

        {competition.rounds.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 mb-3">Ei kierroksia vielä</p>
            <button onClick={() => setShowRoundForm(true)} className="text-blue-600 text-sm hover:underline">Luo ensimmäinen kierros →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {competition.rounds.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                {editRoundId === r.id ? (
                  <div className="space-y-3">
                    <input
                      autoFocus
                      value={editRound.name}
                      onChange={(e) => setEditRound({ ...editRound, name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Veikkaus alkaa</label>
                        <input type="datetime-local" value={editRound.bettingStart} onChange={(e) => setEditRound({ ...editRound, bettingStart: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Veikkaus päättyy</label>
                        <input type="datetime-local" value={editRound.bettingEnd} onChange={(e) => setEditRound({ ...editRound, bettingEnd: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveRound(r.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">Tallenna</button>
                      <button onClick={() => setEditRoundId(null)} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors">Peruuta</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{r.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Veikkaus: {formatDateTimeInFinland(r.bettingStart)} – {formatDateTimeInFinland(r.bettingEnd)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{r._count.matchPairs} otteluparia</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/admin/competitions/${id}/rounds/${r.id}`} className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                        Avaa
                      </Link>
                      <button onClick={() => { setEditRoundId(r.id); setEditRound({ name: r.name, bettingStart: toDatetimeLocalInFinland(r.bettingStart), bettingEnd: toDatetimeLocalInFinland(r.bettingEnd) }); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                        Muokkaa
                      </button>
                      <button onClick={() => handleDeleteRound(r.id, r.name)} className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
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
