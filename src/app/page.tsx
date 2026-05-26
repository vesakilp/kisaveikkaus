import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Kisaveikkaus</h1>
        <p className="text-gray-500 mb-8">Hallinnoi kisoja, kierroksia ja ottelupareja</p>
        <Link
          href="/admin"
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow"
        >
          Siirry hallintapaneeliin
        </Link>
      </div>
    </main>
  );
}
