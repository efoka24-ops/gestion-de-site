import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRU GROUP — Gestion de Production",
  description: "Application de gestion de site de production agroalimentaire",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
