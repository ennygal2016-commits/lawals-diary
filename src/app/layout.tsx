import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { ServiceWorkerRegister } from "@/components/shell/service-worker";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

// DESIGN.md §2 Type: Instrument Serif (display), Geist (UI), Geist Mono (eyebrows, meta, counters).
const geist = Geist({ subsets: ["latin", "latin-ext"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin", "latin-ext"],
  variable: "--font-geist-mono",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_TAGLINE,
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0e0c14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA" className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}>
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
