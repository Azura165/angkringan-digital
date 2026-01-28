import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/sonner";
import { SplashScreen } from "@/components/layout/SplashScreen";

const fontSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // 1. TAMBAHKAN INI (Ganti link sesuai Vercel kamu)
  metadataBase: new URL("https://angkringan-digital.vercel.app"),

  title: "Angkringan Mas Radit | Pesan Online",
  description: "SaaS Angkringan Modern untuk UMKM",

  // 2. PASTI KAN INI SESUAI NAMA FILE DI FOLDER PUBLIC (manifest.json)
  manifest: "/manifest.json",

  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Angkringan Mas Radit 🍢",
    description: "Lapar? Pesan Nasi Kucing & Sate Kulit disini.",
    url: "/",
    siteName: "Angkringan Mas Radit",
    images: [
      {
        url: "/thumbnail.jpg", // Pastikan ada file thumbnail.jpg di public
        width: 1200,
        height: 630,
        alt: "Angkringan Mas Radit Preview",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${fontSans.variable} font-sans antialiased bg-zinc-950 text-zinc-50`}
      >
        <SplashScreen />
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
