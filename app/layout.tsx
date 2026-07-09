import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthMenu } from "@/components/auth/auth-menu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prototyper's Manifesto",
  description:
    "I prototype, therefore I am. Ten principles for people who build to think.",
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
        <AuthMenu />
        {children}
      </body>
    </html>
  );
}
