import Link from "next/link";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center bg-white">
      <div className="text-center px-4">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Kisaveikkaus</h1>
        <p className="text-gray-500 mb-8 max-w-lg">
          Hallinnoi kisoja, kierroksia ja ottelupareja. Kirjaudu sisään aloittaaksesi.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/login"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow"
          >
            Kirjaudu sisään
          </Link>
          <Link
            href="/register"
            className="inline-block px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Rekisteröidy
          </Link>
        </div>
      </div>
    </main>
  );
}
