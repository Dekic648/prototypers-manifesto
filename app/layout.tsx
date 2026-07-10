import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthMenu } from "@/components/auth/auth-menu";
import { AuthErrorNotice } from "@/components/auth/auth-error-notice";
import { AboutLink } from "@/components/about-link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "I prototype, therefore I am. Ten principles for people who build to think.";

export const metadata: Metadata = {
  metadataBase: new URL("https://theprototypersmanifesto.com"),
  title: "The Cult of Prototyping",
  description: DESCRIPTION,
  // opengraph-image.tsx is picked up automatically; these set the text around it.
  openGraph: {
    title: "The Cult of Prototyping",
    description: DESCRIPTION,
    url: "/",
    siteName: "The Cult of Prototyping",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "The Cult of Prototyping",
    description: DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* Extensions (Grammarly, password managers) inject attributes on <body>
          before hydration. Suppressed here only — descendants still warn. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AboutLink />
        <AuthMenu />
        <AuthErrorNotice />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
