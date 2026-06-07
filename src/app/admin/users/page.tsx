"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";

interface User {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ displayName: "", password: "", isAdmin: false });
  const [refreshCount, setRefreshCount] = useState(0);
  const { confirm, dialog } = useConfirm();

  const refresh = useCallback(() => setRefreshCount((count) => count + 1), []);
  const formatCreatedAt = (value: string) => new Date(value).toLocaleDateString("fi-FI");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => {
        if (r.status === 401) {
          window.location.href = "/login";
          throw new Error("Unauthorized");
        }
        if (r.status === 403) {
          setError("Sinulla ei ole oikeutta nähdä käyttäjiä");
          throw new Error("Forbidden");
        }
        return r.json();
      })
      .then((data) => setUsers(data))
      .catch((err) => {
        if (err.message !== "Unauthorized" && err.message !== "Forbidden") {
          setError("Käyttäjien haku epäonnistui");
        }
      })
      .finally(() => setLoading(false));
  }, [refreshCount]);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm({ displayName: user.displayName, password: "", isAdmin: user.isAdmin });
  };

  const handleSave = async (id: number) => {
    const ok = await confirm("Tallenna muutokset", "Tallennetaanko käyttäjän tiedot?");
    if (!ok) return;

    const updateData: { displayName: string; isAdmin: boolean; password?: string } = {
      displayName: editForm.displayName,
      isAdmin: editForm.isAdmin,
    };

    if (editForm.password) {
      updateData.password = editForm.password;
    }

    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      setEditingId(null);
      refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Tallennus epäonnistui");
    }
  };

  const handleDelete = async (id: number, displayName: string) => {
    const ok = await confirm(
      "Poista käyttäjä",
      `Poistetaanko käyttäjä "${displayName}"? Tätä ei voi peruuttaa.`,
      true
    );
    if (!ok) return;

    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      refresh();
    } else {
      const data = await res.json();
      alert(data.error || "Poisto epäonnistui");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ladataan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <p className="mb-4 text-red-500">{error}</p>
          <Link href="/admin" className="text-blue-600 hover:underline">
            ← Takaisin
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/admin" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
            ← Takaisin
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Käyttäjähallinta</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-8">
        {users.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center sm:p-12">
            <p className="text-gray-400">Ei käyttäjiä</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:hidden">
              {users.map((user) => (
                <div key={user.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  {editingId === user.id ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Sähköposti</p>
                        <p className="mt-1 break-all text-sm text-gray-600">{user.email}</p>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Näyttönimi</label>
                        <input
                          type="text"
                          value={editForm.displayName}
                          onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={editForm.isAdmin}
                          onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Admin
                      </label>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-gray-700">Uusi salasana</label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                          placeholder="Valinnainen"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSave(user.id)}
                          className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                        >
                          Tallenna
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                        >
                          Peruuta
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{user.displayName}</p>
                          <p className="break-all text-sm text-gray-600">{user.email}</p>
                        </div>
                        <span
                          className={`shrink-0 rounded px-2 py-1 text-xs ${
                            user.isAdmin ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {user.isAdmin ? "Admin" : "Käyttäjä"}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">ID</p>
                          <p className="mt-1 text-gray-900">{user.id}</p>
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-wide text-gray-400">Luotu</p>
                          <p className="mt-1 text-gray-900">{formatCreatedAt(user.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                        >
                          Muokkaa
                        </button>
                        <button
                          onClick={() => handleDelete(user.id, user.displayName)}
                          className="inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                        >
                          Poista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Sähköposti</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Näyttönimi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Rooli</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Luotu</th>
                      <th className="px-6 py-3 text-right text-xs font-medium uppercase text-gray-500">Toiminnot</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        {editingId === user.id ? (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                            <td className="px-6 py-4">
                              <input
                                type="text"
                                value={editForm.displayName}
                                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                            </td>
                            <td className="px-6 py-4">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={editForm.isAdmin}
                                  onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>Admin</span>
                              </label>
                              <input
                                type="password"
                                value={editForm.password}
                                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                placeholder="Uusi salasana (valinnainen)"
                                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{formatCreatedAt(user.createdAt)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleSave(user.id)}
                                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                                >
                                  Tallenna
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50"
                                >
                                  Peruuta
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{user.displayName}</td>
                            <td className="px-6 py-4">
                              {user.isAdmin ? (
                                <span className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">Admin</span>
                              ) : (
                                <span className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-600">Käyttäjä</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{formatCreatedAt(user.createdAt)}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(user)}
                                  className="rounded-lg px-3 py-2 text-sm text-blue-600 transition-colors hover:bg-blue-50"
                                >
                                  Muokkaa
                                </button>
                                <button
                                  onClick={() => handleDelete(user.id, user.displayName)}
                                  className="rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                                >
                                  Poista
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
