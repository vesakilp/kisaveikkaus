"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";

interface Competition {
  id: number;
  name: string;
  createdAt: string;
  _count: { rounds: number };
}

export default function AdminPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);
  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    fetch("/api/competitions")
      .then((r) => r.json())
      .then((data) => setCompetitions(data))
      .finally(() => setLoading(false));
  }, [refreshCount]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await confirm("Luo uusi kisa", `Luodaanko kisa "${newName}"?`);
    if (!ok) return;
    setSaving(true);
    await fetch("/api/competitions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName }),
    });
    setNewName("");
    setShowForm(false);
    setSaving(false);
    refresh();
  };

  const handleEdit = async (id: number) => {
    const ok = await confirm("Muokkaa kisaa", `Tallennetaanko nimi "${editName}"?`);
    if (!ok) return;
    await fetch(`/api/competitions/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName }),
    });
    setEditId(null);
    refresh();
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm(
      "Poista kisa",
      `Poistetaanko kisa "${name}" kaikkine tietoineen? Tätä ei voi peruuttaa.`,
      true
    );
    if (!ok) return;
    await fetch(`/api/competitions/${id}`, { method: "DELETE" });
    refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-gray-900">Hallintapaneeli</h1>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 sm:w-auto"
          >
            + Uusi kisa
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Uusi kisa</h2>
            <label className="mb-1 block text-sm font-medium text-gray-700">Kisan nimi</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Esim. Jalkapallon MM-kisat 2026"
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              required
            />
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setNewName("");
                }}
                className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
              >
                Peruuta
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="py-12 text-center text-gray-400">Ladataan…</p>
        ) : competitions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center sm:p-12">
            <p className="mb-3 text-gray-400">Ei kisoja vielä</p>
            <button onClick={() => setShowForm(true)} className="text-sm text-blue-600 hover:underline">
              Luo ensimmäinen kisa →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((competition) => (
              <div
                key={competition.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
              >
                {editId === competition.id ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:flex-1"
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleEdit(competition.id)}
                        className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 sm:w-auto"
                      >
                        Tallenna
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 sm:w-auto"
                      >
                        Peruuta
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold text-gray-900">{competition.name}</h3>
                      <p className="mt-0.5 text-xs text-gray-400">{competition._count.rounds} kierrosta</p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      <Link
                        href={`/admin/competitions/${competition.id}`}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 sm:w-auto"
                      >
                        Avaa
                      </Link>
                      <button
                        onClick={() => {
                          setEditId(competition.id);
                          setEditName(competition.name);
                        }}
                        className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 sm:w-auto"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDelete(competition.id, competition.name)}
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
