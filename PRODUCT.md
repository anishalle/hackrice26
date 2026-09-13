# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind. Confirmed by the user in the init
interview. Desktop-first web is the confirmed demo target; the layout must still
hold together on a phone, but the primary judged surface is a laptop screen.

## Users

People with disabilities, across capability axes that the product treats as
independent rather than as a single "accessibility mode":

- **Vision** — from full sight through low vision to blind.
- **Hearing** — from hearing through hard-of-hearing to Deaf.
- **Motor control** — from full control through limited fine motor control to
  head/switch-only input. The user's own framing example: *"if I can't move my
  head left and right"* the identity check must not require it.
- **Speech** — affects whether a voice-first interface is usable at all.
- **Cognitive load** — affects density, pacing, and how much is on screen.

The confirmed secondary audience is other members of the same community: the
social half of the product exists so users can see **how other people with the
same capability profile solved the same problem**.

## Product Purpose

A single account — the **Persona ID** — carries a machine-readable capability
profile. That profile drives three things that are normally hard-coded:

1. **How you prove you are you.** Identity verification picks its modality from
   the profile instead of assuming a default body. A liveness check that asks
   the user to turn their head is not offered to someone who cannot turn their
   head; the flow routes to a modality they can actually complete.
2. **Whether the claim is attested.** The profile can be verified against a
   healthcare provider over a consented, scope-limited query, so a capability
   claim is backed by a record rather than self-asserted.
3. **What the interface becomes.** After sign-in the UI is regenerated from the
   profile. A blind user is not given a screen to read with a screen reader
   bolted on; they get a voice-first surface where press-and-hold anywhere
   starts talking to an agent that reads, posts, and searches on their behalf.

Success is that two users with different profiles see two genuinely different
interfaces over the same data, and both complete the same task.

## Positioning

Accessibility here is the **input to the product's logic**, not a compliance
layer over a finished design. The mechanism a neighboring product could not
truthfully copy: the capability profile is an authenticated, provider-attested
credential that the auth flow and the renderer both read at runtime. Competitors
ship one interface plus accommodations; this ships a different interface per
profile, and can prove the profile is real.

## Operating Context

Two top-level surfaces, confirmed by the user:

- **Feed** — the social network half. Connect with other people with
  disabilities, post, comment, and read how others are solving their problems.
- **Agent** — the assistive half. An agent performs tasks the user used to be
  able to do quickly and no longer can. It also acts as the user's hands and
  eyes inside the Feed: posting, reading replies aloud, searching.

The agent is not a separate chatbot bolted to the side; in voice-first mode it
is the primary way the whole app is operated, Feed included.

## Capabilities and Constraints

- **Capability profile** — structured, per-axis, attached to the Persona ID.
  Read by both the auth router and the UI renderer. The full axis list is
  settled (vision, hearing, motor, speech, cognitive); the exact scale per axis
  is still being fleshed out and may change.
- **Adaptive authentication** — the verification modality is selected from the
  profile. Confirmed requirement; the specific set of fallback modalities is a
  design decision this build will propose.
- **Provider verification** — simulated for now, and deliberately de-scoped by
  the user ("I'd rather you not focus on this part as much"). Implemented as a
  **fake OAuth authorization flow** against a fictional insurer, with an
  explicit scoped-consent screen naming each medical field the app will read, so
  the user can see exactly what is being disclosed. No real PHI, no real
  provider API, no real credentials.
- **Fictional provider name** — the user suggested mirroring a real insurer.
  Recorded decision: use the fictional **Meridian Health** instead, because a
  faithful copy of a real insurer's sign-in page that accepts credentials is
  indistinguishable from a phishing page. Swappable later; the flow is identical.
- **Voice interaction** — press-and-hold anywhere to talk. Confirmed. On the
  desktop-first target this must also be reachable from the keyboard, since
  "hold anywhere on the screen" assumes touch.
- **Undecided** — product name; the post/comment data model beyond the demo
  fixtures; whether agent actions require per-action confirmation.

## Brand Commitments

None established. No name, logo, palette, or voice was made binding during init.

## Evidence on Hand

None. There are no real users, no testimonials, no partner healthcare
institutions, no benchmarks, and no Persona account. Every profile, post, and
verification result in the build is fixture data and must not be presented as
real. Future work must not fabricate provider partnerships or compliance
certifications.

## Product Principles

1. **The profile is the input, not a setting.** Anything that varies by
   capability reads the profile at runtime. No "accessibility mode" toggle
   bolted onto a default design.
2. **Never require a body the user does not have.** Every required interaction —
   above all the identity check — must have a route for each capability profile.
3. **Disclosure is the feature.** When medical data is read, name the exact
   fields on screen before reading them. The consent screen is a product
   surface, not a legal speed bump.
4. **The agent is a peer of the UI, not a widget.** For some profiles the agent
   *is* the interface; it must be able to do anything the visual UI can do.
5. **Simulated means labeled.** Nothing in the demo may imply a real
   verification, a real provider, or real PHI.

## Accessibility & Inclusion

This is the product, so the floor is higher than usual and is a functional
requirement rather than a standard to pass:

- WCAG 2.2 AA as the *minimum*, not the goal.
- Every interactive element keyboard-reachable with a visible focus state; the
  press-and-hold voice affordance has a keyboard equivalent.
- Correct semantics and live regions so the voice-first surface and a real
  screen reader do not fight each other.
- `prefers-reduced-motion` honored throughout.
- Targets sized for limited fine motor control in the motor-adapted profile.
- Captions/transcripts anywhere audio carries meaning, for the Deaf profile.
