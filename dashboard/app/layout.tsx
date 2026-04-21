import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Intent Tracker",
  description: "Détectez les signaux d'intention d'achat sur Reddit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className="dark h-full">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-full`}>
        {children}
      </body>
    </html>
  );
}
