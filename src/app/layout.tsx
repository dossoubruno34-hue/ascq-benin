import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: "ASCQ BÉNIN - Application Officielle",
  description: "Application officielle des Agents de Santé Communautaire Qualifiés (ASCQ) du Bénin",
  applicationName: "ASCQ Bénin",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASCQ Bénin",
  },
  authors: [{ name: "Bruno DOSSOU" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#008751",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="scroll-smooth">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased font-sans selection:bg-emerald-100 selection:text-emerald-900">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
