"use client";

import { useEffect, useState } from "react";
import { getChampionBetPoints } from "@/lib/champion-bet";

interface ChampionOption {
  id: number;
  name: string;
  sortOrder: number;
}

interface ChampionBet {
  id: number;
  bettingStart: string;
  bettingEnd: string;
  points: number;
  options: ChampionOption[];
}

interface ChampionPrediction {
  optionId: number;
  option: { id: number; name: string };
}

interface ChampionBettingProps {
  competitionId: string;
}

export default function ChampionBetting({ competitionId }: ChampionBettingProps) {
  const [championBet, setChampionBet] = useState<ChampionBet | null>(null);
  const [prediction, setPrediction] = useState<ChampionPrediction | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/competitions/${competitionId}`).then((r) => r.json()),
      fetch(`/api/competitions/${competitionId}/my-champion-prediction`).then((r) => (r.ok ? r.json() : { prediction: null })),
    ])
      .then(([compData, predData]) => {
        if (!compData.championBet) {
          setLoading(false);
          return;
        }

        setChampionBet(compData.championBet);
        
        if (predData.prediction) {
          setPrediction(predData.prediction);
          setSelectedOptionId(predData.prediction.optionId);
          setIsExpanded(false);
        } else {
          setIsExpanded(true);
        }
      })
      .catch(() => {
        setError("Tietojen lataus epäonnistui");
      })
      .finally(() => setLoading(false));
  }, [competitionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOptionId || !championBet) return;

    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      const response = await fetch("/api/champion-predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          championBetId: championBet.id,
          optionId: selectedOptionId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Veikkauksen tallennus epäonnistui");
      }

      setPrediction(data);
      setSuccessMessage("Veikkaus tallennettu!");
      setIsExpanded(false);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veikkauksen tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !championBet) {
    return null;
  }

  const now = new Date();
  const bettingStart = new Date(championBet.bettingStart);
  const bettingEnd = new Date(championBet.bettingEnd);
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
            <h3 className="text-lg font-semibold text-gray-900">Mestariveikkaus</h3>
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
            <h3 className="text-lg font-semibold text-gray-900">Mestariveikkaus</h3>
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
    <div className="rounded-2xl border border-amber-200 bg-amber-50 shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-5 text-left sm:p-6"
      >
        <svg className="h-6 w-6 flex-shrink-0 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">Veikkaa kisan voittaja</h3>
          {prediction && (
            <p className="mt-0.5 text-sm text-gray-700">
              Veikkauksesi: <span className="font-semibold">{prediction.option.name}</span>
            </p>
          )}
        </div>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-gray-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="border-t border-amber-200 px-5 pb-5 sm:px-6 sm:pb-6">
          <p className="mt-4 text-sm text-gray-700">
            Veikkaa kuka voittaa kisan ja saa {getChampionBetPoints()} lisäpistettä oikeasta veikkauksesta! 
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
              {championBet.options.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition-colors ${
                    selectedOptionId === option.id
                      ? "border-amber-500 bg-white"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="championOption"
                    value={option.id}
                    checked={selectedOptionId === option.id}
                    onChange={() => setSelectedOptionId(option.id)}
                    className="h-4 w-4 text-amber-600 focus:ring-2 focus:ring-amber-500"
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
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Tallennetaan..." : prediction ? "Päivitä veikkaus" : "Tallenna veikkaus"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
