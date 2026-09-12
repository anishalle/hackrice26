import type { Metadata } from "next";
import { Inter_Tight, Geist_Mono } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Axis — an interface that reads your capability profile",
  description:
    "One profile decides how you prove who you are and what the interface becomes. A social network and an agent, both rendered from your capabilities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-contrast="normal" data-density="full" data-motion="full">
      <body className={`${interTight.variable} ${geistMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
