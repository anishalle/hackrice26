"use client";

import { useMemo } from "react";
import { AUTHORS } from "@/lib/fixtures";
import { useSession } from "@/lib/session";
import { Avatar, useAvatarChoice, type AvatarProps } from "@/components/avatar";

type WallItem = AvatarProps & { name: string; you: boolean };
import { Annotation, PlotLabel, Rule } from "@/components/primitives";
import { VoiceStage } from "@/components/voice-stage";

/**
 * The wall, after blobatar.dev's own.
 *
 * Everyone in the network as a face, derived from their name and nothing else.
 * It earns its place next to the feed rather than just being decoration: the
 * feed argues that people plotted like you have already solved your problem,
 * and the wall is the only screen that shows there is a "people" at all.
 *
 * Names are visible on hover only, so each face has to carry its own
 * accessible name here — the opposite of the feed, where the byline sits in
 * the markup next to it and the face is left decorative.
 */

// Filler residents, so the wall reads as a population rather than as the six
// authors who happen to have posts. Deterministic on purpose: Math.random()
// would hand the server and the client different names and blow hydration.
const FIRST = [
  "Aiko", "Bo", "Caro", "Dov", "Eze", "Fen", "Gijs", "Hana", "Ines", "Jonas",
  "Kira", "Liv", "Mads", "Nour", "Otto", "Pia", "Quim", "Rosa", "Sami", "Tove",
  "Ugo", "Vera", "Wim", "Xiu", "Yara", "Zev", "Anouk", "Bram", "Cleo", "Duc",
];
const LAST = "ABCDEFGHIJKLMNOPRSTVW";

const RESIDENTS: { seed: string; name: string }[] = [
  ...Object.values(AUTHORS).map((a) => ({ seed: a.id, name: a.name })),
  ...Array.from({ length: 138 }, (_, i) => {
    const name = `${FIRST[i % FIRST.length]} ${LAST[(i * 11) % LAST.length]}.`;
    return { seed: `resident:${name}:${i}`, name };
  }),
];

export default function WallPage() {
  const { adaptation } = useSession();
  const you = useAvatarChoice();

  // Your own face goes at the front so there is something to find. It is the
  // customised one, not a seed derived from the account — this is the screen
  // where choosing a face is supposed to have visibly paid off.
  const wall = useMemo<WallItem[]>(
    () => [
      { ...you, name: "You", you: true },
      ...RESIDENTS.map((r) => ({ seed: r.seed, name: r.name, you: false })),
    ],
    [you],
  );

  // A 144-cell grid of faces says nothing to a screen reader worth 144 stops.
  if (adaptation.voiceFirst) {
    return (
      <VoiceStage
        label="Wall"
        emptyLabel="Nobody on the wall yet."
        items={[
          {
            id: "wall",
            meta: `${wall.length} people`,
            title: "The wall",
            body: `${wall.length} people are on the wall. Each one has a face derived from their name. It is a visual index of the network, and everything it shows is also in the feed.`,
          },
        ]}
      />
    );
  }

  return (
    <div>
      <div className="max-w-[36rem]">
        <h1 className="display-sm text-[clamp(1.875rem,4vw,2.75rem)] text-balance">
          Everyone plotting alongside you.
        </h1>
        <Annotation className="mt-4">
          every face here is somebody&rsquo;s name, so hover to read one. yours
          is the one you made in step one
        </Annotation>
      </div>

      <div className="mt-10 flex items-baseline justify-between">
        <PlotLabel>The wall</PlotLabel>
        <PlotLabel className="text-[var(--text-3)]">
          {wall.length} <span className="lowercase tracking-normal">people</span>
        </PlotLabel>
      </div>
      <Rule className="mt-3" />

      <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-1">
        {wall.map((r) => (
          <li key={r.seed} className="group relative">
            <div
              className={`flex aspect-square items-center justify-center rounded-[var(--r-sm)] transition-colors ${
                r.you
                  ? "bg-[var(--brand-dim)] ring-1 ring-[var(--brand)]"
                  : "hover:bg-[var(--surface-2)]"
              }`}
            >
              <Avatar
                seed={r.seed}
                hue={r.hue}
                tone={r.tone}
                expression={r.expression}
                size={44}
                label={r.name}
              />
            </div>

            {/* Hover/focus label. pointer-events-none so it can never sit
                between the cursor and the face it belongs to. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -bottom-1 z-10 truncate text-center font-mono text-[0.625rem] text-[var(--text-2)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
            >
              {r.name}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-10 max-w-[44ch] font-mono text-[0.75rem] leading-[1.6] text-[var(--text-3)]">
        Fixture residents. Only the first face is yours: a seed and three
        settings, kept in this browser and never sent anywhere.
      </p>
    </div>
  );
}
