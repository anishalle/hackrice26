"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { fingerprint } from "@/lib/capability";
import { useSession } from "@/lib/session";
import { VoiceLayer } from "@/components/voice-layer";

/**
 * The companion app's shell, translated from the phone app.
 *
 * Three tabs in a floating pill at the bottom, each carrying its own accent
 * when it is the current one. No top chrome: every screen opens with its own
 * heading, which is what makes the app feel like a place rather than a page
 * inside a website.
 *
 * The adaptation readout that used to live in a right-hand rail is gone. It was
 * the web app explaining itself to a reader evaluating it; this surface is the
 * thing being explained, and the clinician already has that narration in the
 * margin of the record screen. Keeping it here would have been the demo talking
 * over the product.
 */

const TABS = [
  { href: "/feed", label: "home", accent: "var(--signal-mint)" },
  { href: "/agent", label: "agents", accent: "var(--signal-periwinkle)" },
  { href: "/marketplace", label: "marketplace", accent: "var(--signal-peach)" },
  { href: "/voice", label: "voice", accent: "var(--signal-amber)" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, previewing, patient, setPreviewing, adaptation } = useSession();

  const exitPreview = () => {
    setPreviewing(false);
    router.push("/profile");
  };

  return (
    <div className="axl min-h-dvh">
      {/* The way out of a preview is sticky, because a preview replaces the
          whole interface with someone else's and the exit cannot be something
          you have to scroll back up to find. */}
      {previewing && (
        <div
          className="sticky top-0 z-40"
          style={{ backgroundColor: "var(--solid)", color: "var(--solid-ink)" }}
        >
          <div className="mx-auto flex max-w-[34rem] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-2">
            <p className="font-mono text-[0.6875rem] uppercase tracking-[0.12em]">
              Previewing as {patient.name}
              <span className="opacity-60"> · {fingerprint(profile)}</span>
            </p>
            <button
              type="button"
              onClick={exitPreview}
              className="btn-lift inline-flex items-center rounded-[var(--r-pill)] border border-current px-3 py-0.5 font-mono text-[0.625rem] uppercase tracking-[0.12em]"
            >
              Exit
            </button>
          </div>
        </div>
      )}

      {/* Phone-width on purpose. This is a translation of a phone app, and
          stretching it to a desktop grid would be a different design wearing
          its colours. */}
      <div className="mx-auto max-w-[34rem] px-5 pt-8 pb-36">{children}</div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex justify-center px-5 pb-6"
      >
        <div
          className="flex items-center gap-1 rounded-[var(--r-pill)] p-1.5"
          style={{
            backgroundColor: "var(--surface)",
            boxShadow: "0 8px 24px rgb(21 21 21 / 10%)",
          }}
        >
          {TABS.map(({ href, label, accent }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className="target inline-flex items-center justify-center rounded-[var(--r-pill)] px-3 sm:px-6 text-[0.875rem] sm:text-[1rem] font-medium transition-colors"
                style={{
                  backgroundColor: active ? accent : "transparent",
                  color: "var(--text)",
                }}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Only for a profile that actually leads with voice. The phone app has
          no global hold-to-talk button (its mic lives in the agent's composer),
          so showing one to everybody would be this app's furniture sitting in
          the middle of someone else's design. For a voice-first profile it is
          not furniture, it is the primary input, and it earns the space. */}
      {adaptation.voiceFirst && <VoiceLayer />}
    </div>
  );
}
