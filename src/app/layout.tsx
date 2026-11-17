import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppUpdateManager from "@/components/AppUpdateManager";
import InstallAppBanner from "@/components/InstallAppBanner";
import NotificationWatcher from "@/components/NotificationWatcher";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ascq-benin.vercel.app"),
  title: "ASC Santé Communautaire du Bénin — Proximité • Prévention • Solidarité",
  description: "Plateforme officielle de Santé Communautaire du Bénin — Proximité • Prévention • Solidarité. Développé sous la supervision du Ministère de la Santé du Bénin.",
  applicationName: "ASC Santé Communautaire du Bénin",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ASC Bénin",
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
    siteName: "ASC Santé Communautaire du Bénin",
    title: "ASC Santé Communautaire du Bénin — Proximité • Prévention • Solidarité",
    description: "Plateforme officielle de suivi épidémiologique et de santé communautaire du Bénin.",
    images: [
      {
        url: "/logo-asc.png",
        width: 512,
        height: 512,
        alt: "Logo Officiel ASC Santé Communautaire du Bénin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ASC Santé Communautaire du Bénin",
    description: "Plateforme officielle de santé communautaire du Bénin — Proximité • Prévention • Solidarité.",
    images: ["/logo-asc.png"],
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
        <AppUpdateManager />
        <NotificationWatcher />
        {children}
      </body>
    </html>
  );
}
