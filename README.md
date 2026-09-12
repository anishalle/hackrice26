# Axis

An interface that reads your capability profile.

One profile — plotted by the person themselves — decides two things most
software decides for you: **how you prove who you are**, and **what the
interface becomes** once you're in.

> Prototype built for HackRice 26. Every profile, post, verification result and
> medical record in it is fixture data. Nothing contacts a real identity service
> or a real health system.

## The idea

A **Persona ID** carries a machine-readable capability profile across five
independent axes — vision, hearing, motor control, speech, pace. Two things
read that profile at runtime:

1. **The verification router.** A standard liveness check asks you to turn your
   head. If your profile says you can't, that check isn't offered — and the
   screen names the exact demand that ruled it out rather than silently hiding
   it. Provider attestation stays available to everyone as the universal route.
2. **The interface renderer.** Type scale, target size, contrast, density,
   motion and the entire interaction model are derived from the profile. At
   `vision: 0` the app doesn't get bigger text — it becomes a different
   interface: one item at a time, announced aloud, advanced by two targets that
   fill half the viewport.

A healthcare provider can corroborate the profile through a scoped consent
flow, turning a self-asserted claim into a credential.

## Try the adaptation

The whole point is that the same data renders differently. Start at `/profile`,
move an axis, and watch the margin annotate what changed. Then visit `/feed`:

| Set this | And the app does this |
|---|---|
| Vision → *I don't use sight to read a screen* | Voice-first surface, one post at a time, read aloud, full-width hold target |
| Vision → *heavy magnification* | Type scale ×1.5, contrast pushed to maximum |
| Motor → *can't turn my head or hold a device* | Selfie liveness and document scan drop out of verification; targets go to 56px |
| Speech → *I don't speak aloud* | Voice passphrase drops out; nothing requires voice input |
| Pace → *one thing at a time* | One post per screen, motion off, fine grid rules removed |

Hold anywhere on the page — or hold the **space bar** — to talk to the agent.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build && npm run start
node scripts/screenshot.mjs ./shots   # captures every screen × profile × viewport
```

## Where things live

```
src/lib/capability.ts    the five axes, their stops, the Profile type
src/lib/adaptation.ts    Profile → Adaptation. Every UI difference derives here
src/lib/verification.ts  each modality's real requirements, and the router
src/lib/meridian.ts      the fictional provider, its FHIR-shaped scopes
src/lib/session.tsx      external store; writes adaptation to document tokens

src/app/profile          plot your profile, consequences annotate live
src/app/verify           which checks you can finish, and why not the others
src/app/consent          scoped provider authorization
src/app/(app)/feed       the social half
src/app/(app)/agent      the assistive half
```

Components never branch on disability — they branch on `Adaptation`. Adding an
axis means changing `adaptation.ts`, not fifty components.

## Simulated, deliberately

- **Meridian Health is fictional.** It stands in for a real provider
  integration. Its scopes mirror FHIR resource/field pairs so swapping in a real
  one is mechanical. A pixel-copy of a real insurer's sign-in page that accepts
  credentials is a phishing page regardless of intent, so we didn't build one.
- **Verification is simulated.** No identity service is contacted.
- **Speech synthesis is real** where the browser supports it. Speech
  *recognition* is simulated and labelled as such on screen — the Web Speech
  recognition API is Chromium-only and needs a live mic grant, which a demo
  shouldn't depend on.

## Design

The visual world is clinical measurement graphics — the audiogram, the
visual-field plot, the range-of-motion chart — reauthored by the person being
measured rather than by a clinician. See [DESIGN.md](DESIGN.md) for the palette,
type and motion decisions, and [PRODUCT.md](PRODUCT.md) for the product record.
