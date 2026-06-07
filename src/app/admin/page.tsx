"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
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
  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Hallintapaneeli</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          + Uusi kisa
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Uusi kisa</h2>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kisan nimi</label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Esim. Jalkapallon MM-kisat 2026"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              required
            />
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
              >
                {saving ? "Tallennetaan…" : "Tallenna"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setNewName(""); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Peruuta
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-gray-400 text-center py-12">Ladataan…</p>
        ) : competitions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center">
            <p className="text-gray-400 mb-3">Ei kisoja vielä</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-blue-600 text-sm hover:underline"
            >
              Luo ensimmäinen kisa →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex items-center gap-4"
              >
                {editId === c.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => handleEdit(c.id)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Tallenna
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Peruuta
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{c.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{c._count.rounds} kierrosta</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/admin/competitions/${c.id}`}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                      >
                        Avaa
                      </Link>
                      <button
                        onClick={() => { setEditId(c.id); setEditName(c.name); }}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Muokkaa
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Poista
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
