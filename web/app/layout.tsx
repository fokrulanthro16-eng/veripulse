import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VeriPulse | Deterministic AI Agent Audit & Escrow Protocol",
  description: "Cryptographic escrow and deterministic execution audit protocol for autonomous AI agents on Gno.land Onyx testnet.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-hud-bg text-slate-100 antialiased selection:bg-teal-500/30 selection:text-teal-300 hud-grid">
        {children}
      </body>
    </html>
  );
}
