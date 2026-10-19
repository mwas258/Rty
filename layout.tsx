import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { themeInitScript } from "@/components/theme-script";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Arbitrage Finder Pro", template: "%s · Arbitrage Finder Pro" },
  description: "Mobile-first sports arbitrage analysis: live scanner, calculator, watchlists and alerts.",
  manifest: "/manifest.webmanifest",
  applicationName: "Arbitrage Finder Pro",
  appleWebApp: { capable: true, title: "ArbFinder", statusBarStyle: "black-translucent" },
  icons: { icon: [{ url: "/icons/icon.svg", type: "image/svg+xml" }, { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/icons/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b1220",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
