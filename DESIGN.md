# Design

<!-- impeccable:design-schema 1 -->

## World: Chart

The visual world is **clinical measurement graphics, reauthored by the person
being measured** — the audiogram, the visual-field plot, the range-of-motion
chart, the growth curve. Plotted axes, threshold lines, symbol legends, a
graph-paper substrate, and precise margin annotation.

Why this world and not another: a capability profile *is* a chart. This is the
only visual tradition the audience already knows that treats human capability as
precise, legible, plotted data rather than as a deficit to be described in
prose. The product's mechanism — a machine-readable profile that routes auth and
regenerates the UI — is a chart that does something.

**The inversion that keeps it from being cold:** in the medical tradition the
chart is drawn *about* you, by a clinician, on cold white stock, and handed down
as a verdict. Here you draw it, it sits on warm bone paper, it speaks in first
person, and its annotations describe what the *product* will do differently —
never what you lack. "Head-turn liveness unavailable → routing to voice
attestation" is a routing note, not a diagnosis.

**Honest risk:** clinical graphics can read as medicalizing to an audience
tired of being measured. Authorship, warm ground, and first-person copy are the
mitigations, and they have to be enforced in the copy layer, not just the paint.

## Substrate

Bone paper with a 1px rule grid at an 8px module, the rule strengthening every
5th line. The grid is a real measuring surface, not decoration — plots, cards,
and the layout column all snap to it, and it is the app's actual layout grid.
Dark theme reads as a backlit chart: the paper goes to warm graphite and the
rules emit rather than recede.

## Color

Warm ink on bone. Never clinical blue, never gray secondary text.

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` | `#F2EDE1` | `#16140F` | page ground |
| `--paper-raised` | `#FBF8F0` | `#1E1B15` | plotted surfaces, cards |
| `--rule` | `#DDD4BE` | `#2E2A21` | grid, 1px |
| `--rule-major` | `#C8BC9E` | `#3D382C` | every 5th rule, axes |
| `--ink` | `#191510` | `#F4EFE3` | primary text, plot marks |
| `--ink-2` | `#5C5347` | `#A79C88` | secondary — warm-tinted, never gray |
| `--plot` | `#A93B22` | `#E2694A` | the plotted line, the value, you |
| `--attest` | `#1E5F52` | `#5FB3A1` | verified / attested / provider-backed |
| `--route` | `#8A6A12` | `#D2A73A` | routing annotations, adaptation notices |

`--plot` is the only saturated color allowed to carry quantity. `--attest`
appears exclusively where something has been provider-verified, so its presence
is information. `--route` marks every place the UI changed itself because of the
profile — it is the color of the product's core mechanism and must never be used
decoratively.

## Type

- **Display — Instrument Serif.** The authored, human voice. Chart titles and
  page headings. Its warmth is the deliberate counterweight to the clinical
  grammar; without it the world reads as a hospital printout.
- **UI — Geist Sans.** Controls, body, posts. Body measure held to 65–75ch.
- **Measurement — Geist Mono, tabular numerals.** Axis labels, values,
  thresholds, scope names, the fields in the consent screen. Monospace is earned
  here: this is literal measurement and data, not a technical costume.

Scale steps are obvious, not incremental. Tracking floor -0.03em on display.

## Composition

The chart grid is the layout grid. Content sits in plotted regions with visible
axes rather than in a deck of same-size cards. A card is used only where a post
is genuinely a discrete object; nested cards never.

Annotation is a first-class layout element: a hairline leader rule from a mark
out to a mono note in the margin. This is how the app explains itself, and it
replaces the tooltip almost everywhere.

## Signature interaction

**The profile plots live, and the consequences annotate themselves.** As the
user sets each axis, the mark slides along its track and, one beat later, a
leader rule draws out to a margin note naming what the product just changed —
which verification modalities dropped off, what the interface will become. The
adaptation is visible as it is decided, which is the entire product argument in
one interaction.

## Motion

One authored moment per surface, exponential ease-out from an already-visible
default. The authored moment is the leader-rule draw: the mark settles (spring,
low bounce), then the rule strokes out over 240ms, then the note fades up. Never
a uniform entrance on every section.

`prefers-reduced-motion` removes the stroke and the slide; the mark and note
change state instantly. This is not a courtesy here — it is a correctness
requirement for this audience, and it is also wired to the `cognitive` axis.

## Adaptation is visual, not just functional

The same components render differently per profile, and the difference is
designed, not degraded:

- **vision: none** → the visual surface is not the point. A voice-first
  surface: near-full-bleed plot ground, one enormous press-and-hold target, live
  transcript in display size. Everything still renders correctly for a screen
  reader underneath.
- **vision: low** → type scale steps up two stops, `--ink`/`--paper` contrast
  pushed to maximum, rules strengthen, annotation moves inline.
- **motor: limited/minimal** → 56px minimum targets, no drag, no hover-only
  affordance, dwell timing visible as a filling rule.
- **hearing: none** → every audio cue gets a visual equivalent; agent speech
  renders as a transcript by default, not on request.
- **cognitive: high-support** → one decision per screen, density drops, plain
  language, motion off.

## Browser surfaces

Selection, caret, focus ring, and scrollbar are all themed from the palette.
Focus is a 2px `--plot` ring with a 2px paper offset — visible on every surface,
never removed. Numerals are tabular wherever they carry measurement.
