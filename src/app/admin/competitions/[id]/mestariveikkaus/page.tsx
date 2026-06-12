"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { formatDateTimeInFinland, toDatetimeLocalInFinland } from "@/lib/timezone";

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
  resolvedOptionId: number | null;
  resolvedOption: { id: number; name: string } | null;
  options: ChampionOption[];
  _count: { predictions: number };
}

interface CompetitionResponse {
  id: number;
  name: string;
  championBet: ChampionBet | null;
}

interface FormState {
  bettingStart: string;
  bettingEnd: string;
  optionsText: string;
}

const emptyForm: FormState = {
  bettingStart: "",
  bettingEnd: "",
  optionsText: "",
};

function optionsToText(options: ChampionOption[]) {
  return options.map((option) => option.name).join("\n");
}

function mapCompetitionResponse(data: CompetitionResponse) {
  return {
    competition: data,
    form: data.championBet
      ? {
          bettingStart: toDatetimeLocalInFinland(data.championBet.bettingStart),
          bettingEnd: toDatetimeLocalInFinland(data.championBet.bettingEnd),
          optionsText: optionsToText(data.championBet.options),
        }
      : emptyForm,
    winnerId: data.championBet?.resolvedOptionId ? String(data.championBet.resolvedOptionId) : "",
  };
}

export default function ChampionBetAdminPage() {
  const params = useParams();
  const id = params.id as string;

  const [competition, setCompetition] = useState<CompetitionResponse | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [winnerId, setWinnerId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWinner, setSavingWinner] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/competitions/${id}/champion-bet`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "Mestariveikkausta ei voitu ladata");
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
        setError(loadError instanceof Error ? loadError.message : "Mestariveikkausta ei voitu ladata");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const optionCount = useMemo(() => {
    return form.optionsText
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean).length;
  }, [form.optionsText]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    const isNew = !competition?.championBet;
    const ok = await confirm(
      isNew ? "Luo mestariveikkaus" : "Tallenna mestariveikkaus",
      isNew ? "Luodaanko mestariveikkaus tälle kisalle?" : "Tallennetaanko mestariveikkauksen muutokset?"
    );
    if (!ok) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/competitions/${id}/champion-bet`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bettingStart: form.bettingStart,
          bettingEnd: form.bettingEnd,
          options: form.optionsText
            .split("\n")
            .map((option) => option.trim())
            .filter(Boolean),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Tallennus epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, championBet: data } : prev));
      setForm({
        bettingStart: toDatetimeLocalInFinland(data.bettingStart),
        bettingEnd: toDatetimeLocalInFinland(data.bettingEnd),
        optionsText: optionsToText(data.options),
      });
      setWinnerId(data.resolvedOptionId ? String(data.resolvedOptionId) : "");
      setSuccessMessage(isNew ? "Mestariveikkaus luotiin." : "Mestariveikkaus päivitettiin.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWinner = async () => {
    if (!competition?.championBet) return;

    setError("");
    setSuccessMessage("");

    const selectedOption = competition.championBet.options.find((option) => String(option.id) === winnerId);
    const ok = await confirm(
      "Tallenna voittaja",
      selectedOption
        ? `Tallennetaanko vaihtoehto "${selectedOption.name}" oikeaksi voittajaksi?`
        : "Poistetaanko oikea voittaja mestariveikkauksesta?"
    );
    if (!ok) return;

    setSavingWinner(true);

    try {
      const response = await fetch(`/api/competitions/${id}/champion-bet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolvedOptionId: winnerId ? Number(winnerId) : null }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Voittajan tallennus epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, championBet: data } : prev));
      setWinnerId(data.resolvedOptionId ? String(data.resolvedOptionId) : "");
      setSuccessMessage(selectedOption ? "Oikea voittaja tallennettiin." : "Oikea voittaja poistettiin.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Voittajan tallennus epäonnistui");
    } finally {
      setSavingWinner(false);
    }
  };

  const handleDelete = async () => {
    if (!competition?.championBet) return;

    setError("");
    setSuccessMessage("");

    const ok = await confirm(
      "Poista mestariveikkaus",
      "Poistetaanko mestariveikkaus tältä kisalta? Tätä ei voi peruuttaa.",
      true
    );
    if (!ok) return;

    setSaving(true);

    try {
      const response = await fetch(`/api/competitions/${id}/champion-bet`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Poisto epäonnistui");
      }

      setCompetition((prev) => (prev ? { ...prev, championBet: null } : prev));
      setForm(emptyForm);
      setWinnerId("");
      setSuccessMessage("Mestariveikkaus poistettiin.");
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
            <h1 className="text-2xl font-bold text-gray-900">Mestariveikkaus</h1>
            <p className="mt-1 text-sm text-gray-500">
              Määritä voittajaveikkauksen aikaikkuna, vaihtoehdot ja oikea voittaja.
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
              {competition.championBet?.options.length ?? 0}
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Veikkauksia</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {competition.championBet?._count.predictions ?? 0}
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {competition.championBet ? "Muokkaa mestariveikkausta" : "Luo mestariveikkaus"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Oikeasta veikkauksesta saa aina 10 pistettä.
              </p>
            </div>
            {competition.championBet && (
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
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Veikkaus päättyy</label>
              <input
                type="datetime-local"
                value={form.bettingEnd}
                onChange={(event) => setForm((prev) => ({ ...prev, bettingEnd: event.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                required
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-gray-700">Vaihtoehdot</label>
            <textarea
              value={form.optionsText}
              onChange={(event) => setForm((prev) => ({ ...prev, optionsText: event.target.value }))}
              rows={10}
              placeholder={"Suomi\nRuotsi\nSaksa"}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
              required
            />
            <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
              <span>Kirjoita yksi vaihtoehto per rivi.</span>
              <span>{optionCount} vaihtoehtoa</span>
            </div>
            {competition.championBet && competition.championBet._count.predictions > 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Vaihtoehtojen nimiä ei voi enää muuttaa, koska käyttäjät ovat jo veikanneet.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {saving ? "Tallennetaan…" : competition.championBet ? "Tallenna muutokset" : "Luo mestariveikkaus"}
            </button>
          </div>
        </form>

        {competition.championBet && (
          <>
            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Nykyinen tila</h2>
              <dl className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="font-medium text-gray-900">Veikkausaika</dt>
                  <dd>
                    {formatDateTimeInFinland(competition.championBet.bettingStart)} –{" "}
                    {formatDateTimeInFinland(competition.championBet.bettingEnd)}
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="font-medium text-gray-900">Oikea voittaja</dt>
                  <dd>{competition.championBet.resolvedOption?.name ?? "Ei asetettu"}</dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Aseta voittaja</h2>
              <p className="mt-1 text-sm text-gray-500">
                Kun kisa on päättynyt, valitse oikea voittaja ja pistetaulukko laskee 10 lisäpistettä oikeille veikkauksille.
              </p>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Voittajavaihtoehto</label>
                  <select
                    value={winnerId}
                    onChange={(event) => setWinnerId(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
                  >
                    <option value="">Ei voittajaa</option>
                    {competition.championBet.options.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleSaveWinner}
                  disabled={savingWinner}
                  className="inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {savingWinner ? "Tallennetaan…" : "Tallenna voittaja"}
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
