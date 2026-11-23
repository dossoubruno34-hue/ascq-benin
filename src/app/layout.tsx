import type { Metadata, Viewport } from "next";
import "./globals.css";
import AppUpdateManager from "@/components/AppUpdateManager";
import InstallAppBanner from "@/components/InstallAppBanner";
import NotificationWatcher from "@/components/NotificationWatcher";
import SelecteurAppLectureExcel from "@/components/SelecteurAppLectureExcel";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://ascq-benin.vercel.app"),
  title: "SantéCom Bénin — Proximité • Prévention • Solidarité",
  description: "Plateforme officielle SantéCom Bénin — Proximité • Prévention • Solidarité. Développée sous la supervision du Ministère de la Santé du Bénin.",
  applicationName: "SantéCom Bénin",
  manifest: "/manifest.json?v=3",
  icons: {
    icon: [
      { url: "/icon-asc-192.png?v=3", sizes: "192x192", type: "image/png" },
      { url: "/icon-asc-512.png?v=3", sizes: "512x512", type: "image/png" }
    ],
    apple: [
      { url: "/apple-touch-icon.png?v=3", sizes: "180x180", type: "image/png" }
    ]
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SantéCom Bénin",
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
    siteName: "SantéCom Bénin",
    title: "SantéCom Bénin — Proximité • Prévention • Solidarité",
    description: "Plateforme officielle de suivi épidémiologique et de santé communautaire du Bénin.",
    images: [
      {
        url: "/logo-asc.png",
        width: 512,
        height: 512,
        alt: "Logo Officiel SantéCom Bénin",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SantéCom Bénin",
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
        <SelecteurAppLectureExcel />
        {children}
      </body>
    </html>
  );
}
