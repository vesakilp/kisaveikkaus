"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
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

  const refresh = useCallback(() => setRefreshCount((c) => c + 1), []);

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

    const updateData: { displayName: string; isAdmin: boolean; password?: string } = { displayName: editForm.displayName, isAdmin: editForm.isAdmin };
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">Ladataan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
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
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors text-sm">
            ← Takaisin
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Käyttäjähallinta</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">Ei käyttäjiä</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sähköposti</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Näyttönimi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rooli</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Luotu</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toiminnot</th>
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
                            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={editForm.isAdmin}
                              onChange={(e) => setEditForm({ ...editForm, isAdmin: e.target.checked })}
                              className="rounded"
                            />
                            <span className="text-sm">Admin</span>
                          </label>
                          <input
                            type="password"
                            value={editForm.password}
                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                            placeholder="Uusi salasana (valinnainen)"
                            className="w-full border border-gray-300 rounded px-2 py-1 text-xs mt-2"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString("fi-FI")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleSave(user.id)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 mr-2"
                          >
                            Tallenna
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 border border-gray-300 text-gray-600 rounded text-sm hover:bg-gray-50"
                          >
                            Peruuta
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm text-gray-900">{user.id}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">{user.displayName}</td>
                        <td className="px-6 py-4">
                          {user.isAdmin ? (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Admin</span>
                          ) : (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">Käyttäjä</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString("fi-FI")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleEdit(user)}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded mr-2"
                          >
                            Muokkaa
                          </button>
                          <button
                            onClick={() => handleDelete(user.id, user.displayName)}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                          >
                            Poista
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
