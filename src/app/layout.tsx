import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Veikkauskisa",
  description: "Hallinnoi kisoja ja veikkauksia",
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
