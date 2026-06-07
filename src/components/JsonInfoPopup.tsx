"use client";

const JSON_EXAMPLE = `[
  {
    "homeTeam": "Suomi",
    "awayTeam": "Ruotsi",
    "matchDate": "2024-06-15T18:00:00"
  },
  {
    "homeTeam": "Saksa",
    "awayTeam": "Ranska",
    "matchDate": "2024-06-16T21:00:00"
  }
]`;

interface JsonInfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JsonInfoPopup({ isOpen, onClose }: JsonInfoPopupProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/30 p-4 sm:items-center sm:justify-center">
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">JSON-tiedoston muoto</h2>
          <button onClick={onClose} className="text-2xl leading-none text-gray-400 transition-colors hover:text-gray-600">
            &times;
          </button>
        </div>
        <p className="mb-3 text-sm text-gray-600">
          JSON-tiedoston tulee sisältää taulukko ottelupareista. Jokainen ottelu on objekti, jossa on seuraavat kentät:
        </p>
        <ul className="mb-4 list-inside list-disc space-y-1 text-sm text-gray-700">
          <li><span className="rounded bg-gray-100 px-1 font-mono">homeTeam</span> – Kotijoukkueen nimi (teksti)</li>
          <li><span className="rounded bg-gray-100 px-1 font-mono">awayTeam</span> – Vierasjoukkueen nimi (teksti)</li>
          <li><span className="rounded bg-gray-100 px-1 font-mono">matchDate</span> – Ottelun päivämäärä ISO 8601 -muodossa</li>
        </ul>
        <p className="mb-2 text-sm font-medium text-gray-700">Esimerkki:</p>
        <pre className="overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800">
          {JSON_EXAMPLE}
        </pre>
        <button
          onClick={onClose}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
        >
          Sulje
        </button>
      </div>
    </div>
  );
}
