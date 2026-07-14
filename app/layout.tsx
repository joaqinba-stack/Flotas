import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Flotas — Gestión de parque automotor",
  description: "Plataforma de gestión y administración integral de flota vehicular institucional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
