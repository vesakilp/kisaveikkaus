"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { formatDateTimeInFinland } from "@/lib/timezone";

interface OpenAiLog {
  id: number;
  status: string;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  updatedMatches: number;
  createdAt: string;
}

export default function CompetitionOpenAiLogsPage() {
  const params = useParams();
  const id = params.id as string;

  const [logs, setLogs] = useState<OpenAiLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/competitions/${id}/openai-logs`)
      .then((response) => response.json())
      .then((data) => setLogs(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-4xl">
          <div className="mb-2 flex items-center gap-3">
            <Link href={`/admin/competitions/${id}`} className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← Kisan asetuksiin
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">OpenAI-kutsuloki</h1>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:py-8">
        {loading ? (
          <p className="text-gray-400">Ladataan…</p>
        ) : logs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
            <p className="text-gray-400">Ei OpenAI-kutsuja vielä</p>
          </div>
        ) : (
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm font-semibold text-gray-900">{formatDateTimeInFinland(log.createdAt)}</p>
                  <p className={`text-sm font-medium ${log.status === "success" ? "text-green-700" : "text-red-600"}`}>
                    {log.status} · päivitettyjä otteluita: {log.updatedMatches}
                  </p>
                </div>
                {log.errorMessage && <p className="mb-3 text-sm text-red-600">Virhe: {log.errorMessage}</p>}
                <details className="mb-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">Request</summary>
                  <pre className="mt-2 overflow-auto text-xs text-gray-700">{JSON.stringify(log.requestPayload, null, 2)}</pre>
                </details>
                <details className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700">Response</summary>
                  <pre className="mt-2 overflow-auto text-xs text-gray-700">{JSON.stringify(log.responsePayload, null, 2)}</pre>
                </details>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
