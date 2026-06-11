import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import QueryProvider from "@/components/QueryProvider";
import { WalletProvider } from "@/components/WalletProvider";
import { ToastProvider } from "@/components/shared/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://clipcash.ai"),
  title: "ClipCash - AI Clipping V2.0",
  description: "Turn 1 long video into 100+ viral clips. Preview, pick, post & mint.",
  keywords: ["AI clipping", "viral videos", "video editing", "content creation", "SaaS", "video shorts"],
  authors: [{ name: "ClipCash Team" }],
  openGraph: {
    title: "ClipCash - AI Clipping V2.0",
    description: "Turn 1 long video into 100+ viral clips. Preview, pick, post & mint.",
    url: "https://clipcash.ai",
    siteName: "ClipCash",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ClipCash AI Clipping",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClipCash - AI Clipping V2.0",
    description: "Turn 1 long video into 100+ viral clips. Preview, pick, post & mint.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} suppressHydrationWarning>
        <div className="radial-bg" />
        <QueryProvider>
          <WalletProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
