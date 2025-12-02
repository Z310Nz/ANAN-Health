import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { AuthProvider } from "@/contexts/auth-context";
import { FirebaseClientProvider } from "@/firebase";
import Script from "next/script";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  maximumScale: 1.0,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "ANAN Health - เครื่องคิดเบี้ยประกันภัย",
  description: "เครื่องคิดเบี้ยประกันภัยชีวิตและสุขภาพ LINE LIFF",
  icons: {
    icon: [{ url: "/favicon.ico" }],
  },
};

const liffId = process.env.NEXT_PUBLIC_LIFF_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <head>
        {/* LIFF Optimization */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="ANAN Health" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900&display=swap"
          rel="stylesheet"
        />

        {/* LINE LIFF SDK */}
        <Script
          id="line-liff-sdk"
          src="https://static.line-scdn.net/liff/edge/2/sdk.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground">
        {/* LIFF Safe Area */}
        <div className="flex flex-col min-h-screen w-full safe-area-inset">
          <FirebaseClientProvider>
            <AuthProvider>{children}</AuthProvider>
          </FirebaseClientProvider>
        </div>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
