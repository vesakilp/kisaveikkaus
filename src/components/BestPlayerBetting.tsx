"use client";

import { useEffect, useState } from "react";

interface BestPlayerOption {
  id: number;
  name: string;
  sortOrder: number;
}

interface BestPlayerBet {
  id: number;
  bettingStart: string;
  bettingEnd: string;
  points: number;
  options: BestPlayerOption[];
}

interface BestPlayerPrediction {
  optionId: number;
  option: { id: number; name: string };
}

interface BestPlayerBettingProps {
  competitionId: string;
}

export default function BestPlayerBetting({ competitionId }: BestPlayerBettingProps) {
  const [bestPlayerBet, setBestPlayerBet] = useState<BestPlayerBet | null>(null);
  const [prediction, setPrediction] = useState<BestPlayerPrediction | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/competitions/${competitionId}`).then((r) => r.json()),
      fetch(`/api/competitions/${competitionId}/my-best-player-prediction`).then((r) => (r.ok ? r.json() : { prediction: null })),
    ])
      .then(([compData, predData]) => {
        if (!compData.bestPlayerBet) {
          setLoading(false);
          return;
        }

        setBestPlayerBet(compData.bestPlayerBet);

        if (predData.prediction) {
          setPrediction(predData.prediction);
          setSelectedOptionId(predData.prediction.optionId);
        }
      })
      .catch(() => {
        setError("Tietojen lataus epäonnistui");
      })
      .finally(() => setLoading(false));
  }, [competitionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || !bestPlayerBet) return;

    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/best-player-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bestPlayerBetId: bestPlayerBet.id,
          optionId: selectedOptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Veikkauksen tallennus epäonnistui");
      }

      setPrediction(data);
      setSuccessMessage("Veikkaus tallennettu!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veikkauksen tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !bestPlayerBet) {
    return null;
  }

  const now = new Date();
  const bettingStart = new Date(bestPlayerBet.bettingStart);
  const bettingEnd = new Date(bestPlayerBet.bettingEnd);
  const isBeforeStart = now < bettingStart;
  const isAfterEnd = now > bettingEnd;

  if (isBeforeStart) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Paras pelaaja -veikkaus</h3>
            <p className="mt-1 text-sm text-gray-600">
              Veikkaus aukeaa {bettingStart.toLocaleDateString("fi-FI", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAfterEnd) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <svg className="h-6 w-6 flex-shrink-0 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Paras pelaaja -veikkaus</h3>
            <p className="mt-1 text-sm text-gray-600">
              Veikkausaika päättyi {bettingEnd.toLocaleDateString("fi-FI", {
                day: "numeric",
                month: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            {prediction && (
              <p className="mt-2 text-sm text-gray-900">
                Sinun veikkauksesi: <span className="font-semibold">{prediction.option.name}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <svg className="h-6 w-6 flex-shrink-0 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Veikkaa kisan paras pelaaja</h3>
          <p className="mt-1 text-sm text-gray-700">
            Veikkaa kuka on kisan paras pelaaja ja saa {bestPlayerBet.points} lisäpistettä oikeasta veikkauksesta!{" "}
            Veikkausaika päättyy {bettingEnd.toLocaleDateString("fi-FI", {
              day: "numeric",
              month: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {(error || successMessage) && (
            <div
              className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
                error
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-green-200 bg-green-50 text-green-700"
              }`}
            >
              {error || successMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-4">
            <div className="space-y-2">
              {bestPlayerBet.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                    selectedOptionId === option.id
                      ? "border-purple-500 bg-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="bestPlayerOption"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={() => setSelectedOptionId(option.id)}
                    className="h-4 w-4 text-purple-600 focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="flex-1 text-sm font-medium text-gray-900">{option.name}</span>
                  {prediction?.optionId === option.id && (
                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      Nykyinen veikkaus
                    </span>
                  )}
                </label>
              ))}
            </div>

            <button
              type="submit"
              disabled={saving || !selectedOptionId}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Tallennetaan..." : prediction ? "Päivitä veikkaus" : "Tallenna veikkaus"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
