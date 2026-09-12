# Design

<!-- impeccable:design-schema 1 -->

> Replaces the earlier "Chart" world. The user pinned this direction, and a
> pinned direction beats the roll.

## World: the duotone valley

The visual world is a **contre-jour canyon rendered as a luminance duotone** —
two dark masses converging on a bright gap, the whole frame resolved into a
brand-coloured ramp and broken into an ordered dot matrix that thickens toward
the light.

References, in order of weight: **river.ai** (the hero treatment, the dither,
the type register), **Persona** (the palette, since Persona is the identity
layer this product is built on), **natural.com** (restraint and the amount of
air around things).

The reference sites were unreachable from the build environment, so the
system below is derived from the supplied screenshot, the supplied markup
(which names Inter Tight), and a lookup of Persona's published brand colours.
Anything here that needs to match a real brand exactly should be checked
against the source before it ships.

## Why this world fits the product

The mechanism is *a path that exists for you when the default one doesn't*. A
canyon read from inside is exactly that image: the walls are the constraints,
and the gap is the route through them. The duotone is the second half of the
argument — one scene, re-rendered entirely through a different mapping, which
is what the app does to its own interface when the profile changes.

## Palette

Persona's brand ramp, used as the actual duotone stops rather than as accents.

| Token | Hex | Role |
|---|---|---|
| Stratos | `#010334` | ground, and the duotone shadow |
| Cornflower | `#7379FD` | primary action, duotone midtone |
| Periwinkle | `#C8CBFE` | secondary text on dark, soft marks |
| Aquamarine | `#68F0FD` | attested / verified — never decorative |
| Onahau | `#CDFAFF` | duotone highlight |
| Sun | `#FFE3C4` | the warm punch at the top of the range |

Dark is the default. Light is a full peer with its own ramp, not an inversion —
`--brand` darkens to `#4A52E8` and `--accent` to `#0B6E88` so both clear AA on
white. `[data-contrast="max"]`, driven by the vision axis, pushes a third set.

The one deliberate tension: a cool ramp with a single warm light source. That
contrast is what stops the palette reading as generic tech-blue.

## Type

**Inter Tight** throughout, which is what river.ai uses.

- Display: weight 500, tracking `-0.028em`, leading `1.02`, balanced. Tight
  tracking at large sizes is the whole register — at default tracking the same
  words read like a settings page.
- Body: 0.9375–1.1875rem, leading 1.55–1.6, measure held under 70ch.
- **Geist Mono** for anything that is literally data: FHIR resource paths,
  profile fingerprints, axis codes, durations, the eyebrow. Tabular numerals
  wherever a number can change.

## The hero

`src/components/canyon/` — a WebGL fragment shader in three stages.

1. **Raymarch.** An SDF height field: a smoothstep wall profile with blobs
   smin'd into it, so the walls read as continuous rounded mass rather than as
   noise. Five bisection steps after the hit kill the grazing-angle streaks a
   non-metric field otherwise produces.
2. **Resolve to luminance.** Deliberately colourless. Backlit, so the walls are
   silhouettes; aerial perspective separates the far masses from the near ones.
3. **Duotone + dither.** Luminance maps through the three-stop ramp, and
   **the strength of that mapping scales with luminance** — shadows keep the
   ground colour, highlights take the ramp fully. An 8×8 Bayer matrix is gated
   on the same value, so the dots thicken toward the light and the darks stay
   clean.

Sampling follows river.ai's own debug values, read off the markup they
published: `AA MODE SSAA ×8`, `R SCALE 1.00`, `REFINE 14 / bisect`,
`POV HZN 0.570`. They buy clean silhouettes with supersampling at full
resolution rather than with a bigger buffer. Here that is 4 taps on a rotated
2×2 grid at a 0.65–0.8 buffer — the same trade at a fraction of the cost,
since the edges are what the sampling is for. Refinement is 10 bisection
steps and the horizon sits at 0.570.

An adaptive governor mirrors their `AUTO AA` toggle: start supersampled, drop
to one tap when the budget can't hold it, never climb back (oscillating
between AA modes looks worse than the lower one). It watches two signals —
a sustained overrun averaged over 30 frames, and any grossly slow frame,
which is *not* treated as an outlier to discard: on a weak GPU every frame
looks like that, and a governor that filters them never fires on the machines
that need it.

Budget: ~30fps, 76–104 march steps, and it stops entirely when scrolled out of
view or the tab is hidden. A CSS gradient sits underneath as the no-WebGL fallback
and as the colour the canvas resolves to anyway, so there is never a flash.

**It is capability-aware, like everything else.** Reduced motion resolves one
frame and freezes. A low-vision profile drops the dot matrix and cuts filter
strength, so the ground stays flat enough for text contrast to hold.

## Chrome, from Persona's site

Read off a supplied screenshot of withpersona.com rather than its CSS:

- **Primary action is a maximum-contrast pill** — near-black on light, near-
  white on dark, with a trailing arrow. Cornflower is deliberately *not* the
  button colour; keeping it out of the primary action is what lets it keep
  meaning something where it does appear.
- **An announcement bar across the top.** Persona uses the slot for a Gartner
  placement; here it carries the prototype disclosure, so the one thing a
  viewer must not miss is the one thing they cannot scroll past. Pale
  periwinkle with dark ink in light, deep brand wash in dark — it has its own
  token pair, since the AA-safe light-mode brand is far too saturated for it.
- **A warm off-white ground in light mode** (`#F4F4F2`), not a cool one.
- **Monoline icons**, ~1.5px stroke, rounded joins, 24px grid. The set already
  built matches this, which is the one thing the screenshot confirmed rather
  than changed.

Persona's actual typeface could not be identified from a screenshot and is
**not** DM Sans (that result belongs to an unrelated design system of the same
name). Inter Tight stands in, on river.ai's authority.

## Composition

The camera yaws left so the gap and sun sit right of centre, leaving the left
third as dark mass for the headline. Two gradient scrims — one up from the
bottom, one in from the left — guarantee the text floor regardless of what the
shader resolves to. The background is never allowed to decide whether the
headline is readable.

Elsewhere: generous air, one hairline border **or** one soft shadow for
elevation but never both, 14px radii on surfaces and 10px on controls, full-
bleed hairline dividers instead of stacked card decks.

## Motion

One authored moment per surface, exponential ease-out, `[0.16, 1, 0.3, 1]`.
The hero's is a staggered rise on load; everything else earns its motion or
doesn't get any. `prefers-reduced-motion` and the pace axis both cut it, and
for this audience that is correctness, not courtesy.

## Browser surfaces

Selection, caret, focus ring and scrollbar all themed. Focus is a 2px
`--accent` ring at 2px offset — visible on every surface, never removed.
