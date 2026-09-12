import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import "./globals.css";

// Inter Tight is what river.ai uses, and the closest free grotesque to
// Persona's ABC Monument Grotesk, which is commercially licensed. Weight 300
// is loaded because both references carry their display type on it.
const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400"],
});

export const metadata: Metadata = {
  title: "Axis — an interface that reads your capability profile",
  description:
    "One profile decides how you prove who you are and what the interface becomes. A social network and an agent, both rendered from your capabilities.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" data-contrast="normal" data-density="full" data-motion="full">
      <body className={`${interTight.variable} ${jetbrainsMono.variable} antialiased`}>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
