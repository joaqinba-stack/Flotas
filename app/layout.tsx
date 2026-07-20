import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import "./ds-blueprint.css";

// El design system pide Barlow / Barlow Condensed. Las servimos con next/font
// en vez del @import a fonts.googleapis.com que traía el CSS original: así se
// autoalojan en el build y no agregan una request bloqueante por pantalla.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-barlow",
  display: "swap",
});
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Flotas — Gestión de parque automotor",
  description: "Plataforma de gestión y administración integral de flota vehicular institucional",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Las variables solo declaran las familias; quién las usa es .ds, así que el
  // resto de la app sigue en system-ui.
  return (
    <html lang="es" className={`${barlow.variable} ${barlowCondensed.variable}`}>
      <body>{children}</body>
    </html>
  );
}
