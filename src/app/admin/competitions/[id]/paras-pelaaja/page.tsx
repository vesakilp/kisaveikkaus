"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { toDatetimeLocalInFinland } from "@/lib/timezone";

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
  resolvedOptionId: number | null;
  resolvedOption: { id: number; name: string } | null;
  options: BestPlayerOption[];
  _count: { predictions: number };
}

interface CompetitionResponse {
  id: number;
  name: string;
  bestPlayerBet: BestPlayerBet | null;
}

interface OptionFormItem {
  id: number | null;
  name: string;
  tempId: string;
}

interface FormState {
  bettingStart: string;
  bettingEnd: string;
  options: OptionFormItem[];
}

const emptyForm: FormState = {
  bettingStart: "",
  bettingEnd: "",
  options: [],
};

function mapCompetitionResponse(data: CompetitionResponse) {
  return {
    competition: data,
    form: data.bestPlayerBet
      ? {
          bettingStart: toDatetimeLocalInFinland(data.bestPlayerBet.bettingStart),
          bettingEnd: toDatetimeLocalInFinland(data.bestPlayerBet.bettingEnd),
          options: data.bestPlayerBet.options.map((opt) => ({
            id: opt.id,
            name: opt.name,
            tempId: `existing-${opt.id}`,
          })),
        }
      : emptyForm,
    winnerId: data.bestPlayerBet?.resolvedOptionId ?? null,
  };
}

export default function BestPlayerBetAdminPage() {
  const params = useParams();
  const id = params.id as string;

  const [competition, setCompetition] = useState<CompetitionResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [winnerId, setWinnerId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { confirm, dialog } = useConfirm();
  const [nextTempId, setNextTempId] = useState(1);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/competitions/${id}/best-player-bet`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Paras pelaaja -veikkausta ei voitu ladata");
        }

        return data as CompetitionResponse;
      })
      .then((data) => {
        if (cancelled) return;

        const mapped = mapCompetitionResponse(data);
        setCompetition(mapped.competition);
        setForm(mapped.form);
        setWinnerId(mapped.winnerId);
      })
      .catch((loadError) => {
        if (cancelled) return;
        setCompetition(null);
        setError(loadError instanceof Error ? loadError.message : "Paras pelaaja -veikkausta ei voitu ladata");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const addOption = () => {
    setForm((prev) => ({
      ...prev,
      options: [...prev.options, { id: null, name: "", tempId: `new-${nextTempId}` }],
    }));
    setNextTempId((prev) => prev + 1);
  };

  const updateOption = (tempId: string, name: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt) => (opt.tempId === tempId ? { ...opt, name } : opt)),
    }));
  };

  const removeOption = (tempId: string) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.filter((opt) => opt.tempId !== tempId),
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!form.bettingStart) {
      setError("Veikkauksen alkamisaika on pakollinen");
      return;
    }

    if (!form.bettingEnd) {
      setError("Veikkauksen päättymisaika on pakollinen");
      return;
    }

    const optionNames = form.options.map((opt) => opt.name.trim()).filter(Boolean);

    if (optionNames.length < 2) {
      setError("Lisää vähintään kaksi vaihtoehtoa");
      return;
    }

    const isNew = !competition?.bestPlayerBet;
    const ok = await confirm(
      isNew ? "Luo paras pelaaja -veikkaus" : "Tallenna paras pelaaja -veikkaus",
      isNew ? "Luodaanko paras pelaaja -veikkaus tälle kisalle?" : "Tallennetaanko muutokset?"
    );
    if (!ok) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/competitions/${id}/best-player-bet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bettingStart: form.bettingStart,
          bettingEnd: form.bettingEnd,
          options: optionNames,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Tallennus epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, bestPlayerBet: data } : prev));
      setForm({
        bettingStart: toDatetimeLocalInFinland(data.bettingStart),
        bettingEnd: toDatetimeLocalInFinland(data.bettingEnd),
        options: data.options.map((opt: BestPlayerOption) => ({
          id: opt.id,
          name: opt.name,
          tempId: `existing-${opt.id}`,
        })),
      });
      setWinnerId(data.resolvedOptionId ?? null);
      setSuccessMessage(isNew ? "Paras pelaaja -veikkaus luotiin." : "Paras pelaaja -veikkaus päivitettiin.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleSetWinner = async (optionId: number | null) => {
    if (!competition?.bestPlayerBet) return;

    setError("");
    setSuccessMessage("");

    const selectedOption = optionId ? competition.bestPlayerBet.options.find((option) => option.id === optionId) : null;
    const ok = await confirm(
      "Tallenna paras pelaaja",
      selectedOption
        ? `Tallennetaanko "${selectedOption.name}" parhaaksi pelaajaksi?`
        : "Poistetaanko paras pelaaja -veikkauksesta oikea vastaus?"
    );
    if (!ok) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/competitions/${id}/best-player-bet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedOptionId: optionId }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Tallentaminen epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, bestPlayerBet: data } : prev));
      setWinnerId(data.resolvedOptionId ?? null);
      setSuccessMessage(selectedOption ? "Paras pelaaja tallennettiin." : "Paras pelaaja poistettiin.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Tallentaminen epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!competition?.bestPlayerBet) return;

    setError("");
    setSuccessMessage("");

    const ok = await confirm(
      "Poista paras pelaaja -veikkaus",
      "Poistetaanko paras pelaaja -veikkaus tältä kisalta? Tätä ei voi peruuttaa.",
      true
    );
    if (!ok) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/competitions/${id}/best-player-bet`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Poisto epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, bestPlayerBet: null } : prev));
      setForm(emptyForm);
      setWinnerId(null);
      setSuccessMessage("Paras pelaaja -veikkaus poistettiin.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Poisto epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-gray-400">Ladataan…</p></div>;
  }

  if (!competition) {
    return <div className="flex min-h-screen items-center justify-center bg-gray-50"><p className="text-red-500">Kisaa ei löydy</p></div>;
  }

  const validOptionCount = form.options.filter(opt => opt.name.trim()).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {dialog}

      <header className="border-b border-gray-200 bg-white px-4 py-4 shadow-sm sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
          <div className="mb-2 flex items-center gap-3">
            <Link href={`/admin/competitions/${id}`} className="text-sm text-gray-400 transition-colors hover:text-gray-600">
              ← {competition.name}
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Paras pelaaja -veikkaus</h1>
            <p className="mt-1 text-sm text-gray-500">
              Määritä paras pelaaja -veikkauksen aikaikkuna, pelaajat ja oikea vastaus.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-8">
        {(error || successMessage) && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || successMessage}
          </div>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Pisteet</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">10</p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Vaihtoehtoja</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {competition.bestPlayerBet?.options.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Veikkauksia</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {competition.bestPlayerBet?._count.predictions ?? 0}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} noValidate className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {competition.bestPlayerBet ? "Muokkaa paras pelaaja -veikkausta" : "Luo paras pelaaja -veikkaus"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Oikeasta veikkauksesta saa aina 10 pistettä.
              </p>
            </div>
            {competition.bestPlayerBet && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Poista
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Veikkaus alkaa</label>
              <input
                type="datetime-local"
                value={form.bettingStart}
                onChange={(event) => setForm((prev) => ({ ...prev, bettingStart: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Veikkaus päättyy</label>
              <input
                type="datetime-local"
                value={form.bettingEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, bettingEnd: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">Pelaajat</label>
              <span className="text-xs text-gray-500">{validOptionCount} pelaajaa</span>
            </div>
            <div className="space-y-2">
              {form.options.map((option, index) => (
                <div key={option.tempId} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={option.name}
                    onChange={(e) => updateOption(option.tempId, e.target.value)}
                    placeholder={`Pelaaja ${index + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                    disabled={!!(competition.bestPlayerBet && competition.bestPlayerBet._count.predictions > 0)}
                  />

                  {competition.bestPlayerBet && option.id && (
                    <button
                      type="button"
                      onClick={() => handleSetWinner(winnerId === option.id ? null : option.id)}
                      disabled={saving || !option.name.trim()}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        winnerId === option.id
                          ? "bg-green-600 text-white hover:bg-green-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title={winnerId === option.id ? "Poista paras pelaaja" : "Aseta parhaaksi pelaajaksi"}
                    >
                      {winnerId === option.id ? (
                        <>
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Paras pelaaja
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Valitse
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => removeOption(option.tempId)}
                    disabled={!!(competition.bestPlayerBet && competition.bestPlayerBet._count.predictions > 0)}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title="Poista pelaaja"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addOption}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Lisää pelaaja
            </button>

            {competition.bestPlayerBet && competition.bestPlayerBet._count.predictions > 0 && (
              <p className="mt-2 text-xs text-purple-700">
                Pelaajien nimiä ei voi enää muuttaa eikä poistaa, koska käyttäjät ovat jo veikanneet.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Tallennetaan…" : competition.bestPlayerBet ? "Tallenna muutokset" : "Luo paras pelaaja -veikkaus"}
            </button>
          </div>
        </form>

        {competition.bestPlayerBet && winnerId && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5 shadow-sm sm:p-6">
            <div className="flex items-start gap-3">
              <svg className="h-6 w-6 flex-shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-green-900">Paras pelaaja asetettu</h3>
                <p className="mt-1 text-sm text-green-700">
                  <span className="font-medium">{competition.bestPlayerBet.resolvedOption?.name}</span> on valittu kisan parhaaksi pelaajaksi.
                  Pistetaulukko laskee 10 lisäpistettä oikeille veikkauksille.
                </p>
              </div>
            </div>
          </div>
        )}

        {competition.bestPlayerBet && !competition.bestPlayerBet.options.length && (
          <div className="mt-6 rounded-2xl border border-purple-200 bg-purple-50 p-5 shadow-sm sm:p-6">
            <p className="text-sm text-purple-800">
              Lisää pelaajia yllä olevaan lomakkeeseen ja tallenna.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
