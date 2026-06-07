import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center bg-white px-4 py-12 sm:px-6 sm:py-16">
      <div className="w-full max-w-xl text-center">
        <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl">Kisaveikkaus</h1>
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
