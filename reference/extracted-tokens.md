# Extracted tokens

Pulled from live sites with `reference/extract-tokens.js`, run in the user's
own browser (the sandbox proxy blocks these hosts). These are measured values,
not inferences from screenshots.

## withpersona.com

| | Value |
|---|---|
| Typeface | **ABC Monument Grotesk** (Dinamo, commercial licence) — 2772 uses |
| Weights | **300** (19), 400 (7) — light dominates |
| Display | 48/32/28/24/20px at **weight 300**, leading **1.04–1.12**, tracking **−0.008em** |
| Body | 16/15/14/13px at 400, leading **1.40** |
| Primary blue | **#3f48fd** |
| Light ground | **#f6f6f6** |
| Also present | #010334 (Stratos), #c8cbfe (Periwinkle), #d4d4d4, #000, #fff |
| Radii | **16px** (27 uses — dominant), 30px, 40px, 85px, 9999px, 4px |

`#3f48fd` supersedes the `#7379FD` a brand-asset lookup reported. The live
site is the authority.

ABC Monument Grotesk is commercially licensed and cannot be vendored here.
Inter Tight stands in — it is what river.ai actually uses, and it is the
closest free grotesque in proportion and weight range.

## river.ai

Full token set, read from `:root`:

```css
--paper: #F2E9D6;        --paper-deep: #E8DCC0;
--ink: #0E2F7E;          --ink-2: #1F3F8E;      --ink-3: #6B7898;
--rule: #D8CCAA;
--accent: #1E6CC4;       --accent-2: #6DA89F;   --accent-3: #BCDAD0;
--accent-hover: #2A7CD4;
--type-sans:  "Inter Tight", "Inter", …
--type-mono:  "JetBrains Mono", "SF Mono", …
--type-serif: "Instrument Serif", "Iowan Old Style", …
--grid: 1440px;          --body: 800px;
--pad-x: clamp(20px, 4vw, 56px);
--gutter: clamp(40px, 9vw, 128px);
--hero-overscan: 90px;
```

**The page is warm cream paper with deep blue ink.** The dark blue is the hero
only. The supplied screenshot was the hero alone, which is why this build went
dark throughout.

| | Value |
|---|---|
| Weights | 400 (40), **300** (16), 500 (6) |
| Body | **17px / 300 / leading 1.60** |
| Headings | 24px / 400 / leading 1.22 / tracking −0.02em |
| Eyebrows | 10–12px / 400 / tracking **0.09em–0.22em** |
| Radii | **999px** (pills), **16px** (cards), **10px** (small) |

## What both agree on

- Light weights carry display type. Neither uses 500+ for headings.
- 16px card radius, pill buttons.
- Tracking is negative but gentle — −0.008em to −0.02em, not −0.03em.
- Body leading is generous: 1.40 (Persona) to 1.60 (river).
