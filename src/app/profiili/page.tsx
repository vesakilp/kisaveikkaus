"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SESSION_UPDATED_EVENT } from "@/lib/auth/events";

export default function ProfilePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/login");
          return null;
        }

        if (!response.ok) {
          throw new Error("Session fetch failed");
        }

        return response.json();
      })
      .then((data) => {
        if (!data) return;

        if (!data.user) {
          router.push("/login");
          return;
        }

        setDisplayName(data.user.displayName ?? "");
      })
      .catch(() => {
        setError("Käyttäjätietojen haku epäonnistui");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Näyttönimen päivitys epäonnistui");
        setSaving(false);
        return;
      }

      setDisplayName(data.user.displayName ?? "");
      setSuccess("Näyttönimi päivitetty");
      window.dispatchEvent(new Event(SESSION_UPDATED_EVENT));
      router.refresh();
    } catch {
      setError("Näyttönimen päivitys epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">Oma profiili</h1>

        {loading ? (
          <p className="text-center text-sm text-gray-500">Ladataan...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                {success}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Näyttönimi</label>
              <input
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Tallennetaan..." : "Tallenna näyttönimi"}
            </button>
          </form>
        )}

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-400 transition-colors hover:text-gray-600">
            ← Takaisin etusivulle
          </Link>
        </div>
      </div>
    </main>
  );
}
