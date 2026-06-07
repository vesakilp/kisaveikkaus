import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";

export const metadata: Metadata = {
  title: "Kisaveikkaus",
  description: "Hallinnoi kisoja ja veikkauksia",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
