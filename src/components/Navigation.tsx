"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SESSION_UPDATED_EVENT } from "@/lib/auth/events";

interface User {
  id: number;
  email: string;
  displayName: string;
  isAdmin: boolean;
}

export default function Navigation() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sessionVersion, setSessionVersion] = useState(0);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname, sessionVersion]);

  useEffect(() => {
    const handleSessionUpdated = () => {
      setSessionVersion((value) => value + 1);
    };

    window.addEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);
    return () => {
      window.removeEventListener(SESSION_UPDATED_EVENT, handleSessionUpdated);
    };
  }, []);

  const links = useMemo(() => {
    if (!user) return [];

    return [
      { href: "/kisat", label: "Kisat" },
      ...(user.isAdmin
        ? [
            { href: "/admin", label: "Hallintapaneeli" },
            { href: "/admin/users", label: "Käyttäjät" },
          ]
        : []),
    ];
  }, [user]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    closeMenus();
    setUser(null);
    router.push("/");
    router.refresh();
  };

  const closeMenus = () => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link
          href="/"
          onClick={closeMenus}
          className="text-lg font-bold text-gray-900 transition-colors hover:text-gray-700 sm:text-xl"
        >
          Veikkauskisa
        </Link>

        {loading ? (
          <div className="h-9 w-24 animate-pulse rounded-lg bg-gray-100" />
        ) : (
          <>
            <div className="hidden items-center gap-2 md:flex">
              {user ? (
                <>
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenus}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu((value) => !value)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-gray-100"
                    >
                      <span className="max-w-36 truncate text-sm font-medium text-gray-900">{user.displayName}</span>
                      {user.isAdmin && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                          Admin
                        </span>
                      )}
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {showUserMenu && (
                      <>
                        <button
                          type="button"
                          aria-label="Sulje käyttäjävalikko"
                          className="fixed inset-0 z-10"
                          onClick={() => setShowUserMenu(false)}
                        />
                        <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                          <div className="border-b border-gray-100 px-4 py-3">
                            <p className="text-xs text-gray-500">Kirjautunut:</p>
                            <p className="truncate text-sm font-medium text-gray-900">{user.email}</p>
                          </div>
                           <Link
                             href="/profiili"
                             onClick={closeMenus}
                             className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                           >
                             Muokkaa näyttönimeä
                           </Link>
                           <button
                             onClick={handleLogout}
                             className="w-full px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
                           >
                             Kirjaudu ulos
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={closeMenus}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
                  >
                    Kirjaudu
                  </Link>
                  <Link
                    href="/register"
                    onClick={closeMenus}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    Rekisteröidy
                  </Link>
                </>
              )}
            </div>

            <button
              type="button"
              aria-label={showMobileMenu ? "Sulje valikko" : "Avaa valikko"}
              aria-expanded={showMobileMenu}
              onClick={() => setShowMobileMenu((value) => !value)}
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 md:hidden"
            >
              {showMobileMenu ? (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>

      {!loading && showMobileMenu && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
            {user ? (
              <>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.displayName}</p>
                      <p className="truncate text-xs text-gray-500">{user.email}</p>
                    </div>
                    {user.isAdmin && (
                      <span className="shrink-0 rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenus}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/profiili"
                    onClick={closeMenus}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    Muokkaa näyttönimeä
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                  >
                    Kirjaudu ulos
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={closeMenus}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Kirjaudu
                </Link>
                <Link
                  href="/register"
                  onClick={closeMenus}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-blue-700"
                >
                  Rekisteröidy
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
