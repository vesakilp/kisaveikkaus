import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getSession();

  if (!session) {
    return (
      <main className="flex flex-1 items-center justify-center bg-white px-4 py-12 sm:px-6 sm:py-16">
        <div className="w-full max-w-xl text-center">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Veikkauskisa</h1>
          <p className="mx-auto mb-8 max-w-lg text-sm text-gray-500 sm:text-base">
            Hallinnoi kisoja, kierroksia ja ottelupareja. Kirjaudu sisään aloittaaksesi.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow transition-colors hover:bg-blue-700 sm:w-auto"
            >
              Kirjaudu sisään
            </Link>
            <Link
              href="/register"
              className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
            >
              Rekisteröidy
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const competitions = await prisma.competition.findMany({
    include: {
      rounds: {
        orderBy: { bettingStart: "asc" },
        where: {
          matchPairs: { some: { matchDate: { gt: new Date() } } },
        },
        select: {
          id: true,
          name: true,
          _count: { select: { matchPairs: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const activeCompetitions = competitions.filter(c => c.rounds.length > 0);

  return (
    <main className="flex flex-1 flex-col bg-white px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
            Tervetuloa, {session.displayName}!
          </h1>
          <p className="mt-2 text-sm text-gray-500 sm:text-base">
            Tässä ovat käynnissä olevat kisat
          </p>
        </div>

        {activeCompetitions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-500">Ei käynnissä olevia kisoja tällä hetkellä.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeCompetitions.map((competition) => (
              <div
                key={competition.id}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {competition.name}
                    </h2>
                    <div className="mt-3 space-y-2">
                      {competition.rounds.map((round) => (
                        <div
                          key={round.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-700">{round.name}</span>
                          <span className="text-gray-500">
                            {round._count.matchPairs} ottelua
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Link
                    href={`/kisat/${competition.id}`}
                    className="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Avaa
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
