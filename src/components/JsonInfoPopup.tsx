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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">JSON-tiedoston muoto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none">&times;</button>
        </div>
        <p className="text-gray-600 mb-3 text-sm">
          JSON-tiedoston tulee sisältää taulukko ottelupareista. Jokainen ottelu on objekti, jossa on seuraavat kentät:
        </p>
        <ul className="text-sm text-gray-700 mb-4 space-y-1 list-disc list-inside">
          <li><span className="font-mono bg-gray-100 px-1 rounded">homeTeam</span> – Kotijoukkueen nimi (teksti)</li>
          <li><span className="font-mono bg-gray-100 px-1 rounded">awayTeam</span> – Vierasjoukkueen nimi (teksti)</li>
          <li><span className="font-mono bg-gray-100 px-1 rounded">matchDate</span> – Ottelun päivämäärä ISO 8601 -muodossa</li>
        </ul>
        <p className="text-sm font-medium text-gray-700 mb-2">Esimerkki:</p>
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono overflow-auto text-gray-800">
          {JSON_EXAMPLE}
        </pre>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Sulje
        </button>
      </div>
    </div>
  );
}
