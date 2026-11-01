import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import InstallAppBanner from "@/components/InstallAppBanner";
import NotificationWatcher from "@/components/NotificationWatcher";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ascq-benin.vercel.app"),
  title: "ASCQ BÉNIN - Application Officielle de Santé Communautaire",
  description: "Plateforme officielle et sécurisée de surveillance épidémiologique, d'activité et de rapportage pour les Agents de Santé Communautaire Qualifiés (ASCQ) et Relais Communautaires (RC) de la République du Bénin.",
  applicationName: "ASCQ Bénin",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASCQ Bénin",
  },
  authors: [{ name: "Ministère de la Santé du Bénin / Bruno DOSSOU" }],
  publisher: "Ministère de la Santé du Bénin",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    url: "https://ascq-benin.vercel.app",
    siteName: "ASCQ Bénin - Plateforme Officielle",
    title: "ASCQ BÉNIN - Application Officielle de Santé Communautaire",
    description: "Plateforme officielle de suivi épidémiologique et de rapportage communautaire du Bénin.",
    images: [
      {
        url: "/logo-ascq.png",
        width: 512,
        height: 512,
        alt: "Logo Officiel ASCQ Bénin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASCQ BÉNIN - Application Officielle",
    description: "Plateforme officielle de santé communautaire du Bénin.",
    images: ["/logo-ascq.png"],
  },
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
        <InstallAppBanner />
        <ServiceWorkerRegister />
        <NotificationWatcher />
        {children}
      </body>
    </html>
  );
}
