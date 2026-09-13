import type { Metadata } from "next";
import { Inter_Tight, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { SessionProvider } from "@/lib/session";
import { DevAnnotator } from "@/components/dev-annotator";
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
  title: "ALS takes your velocity. Aide gives it back.",
  description:
    "A companion app for people with ALS. A weekly voice check-in tracks how speech and movement are changing, the interface adapts as they do, and agents take on the tasks that got slow.",
};

/**
 * Two providers, two jobs, deliberately separate:
 *
 * - AuthProvider (Appwrite, from the backend scaffold) answers *who* the
 *   account is. Magic-link sign-in, session persistence.
 * - SessionProvider answers *how this person uses an interface* — the
 *   capability profile that drives verification routing and rendering.
 *
 * An account is not a capability profile, and collapsing them would make the
 * profile a property of the login rather than of the person.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="light"
      data-contrast="normal"
      data-density="full"
      data-motion="full"
      className={`${interTight.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <SessionProvider>{children}</SessionProvider>
        </AuthProvider>
        {/* Renders nothing outside development — see the component. */}
        <DevAnnotator />
      </body>
    </html>
  );
}
