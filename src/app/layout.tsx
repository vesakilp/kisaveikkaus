import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

const TROPHY_FAVICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='central' text-anchor='middle' font-size='24'%3E%F0%9F%8F%86%3C/text%3E%3C/svg%3E";

export const metadata: Metadata = {
  title: "Veikkauskisa",
  description: "Hallinnoi kisoja ja veikkauksia",
  icons: {
    icon: TROPHY_FAVICON,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="h-full">
      <body className="flex min-h-screen flex-col bg-gray-50 text-gray-900 antialiased">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
