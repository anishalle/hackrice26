import { ButtonLink, Annotation, PlotLabel, Rule, SimulatedBadge } from "@/components/ui";
import { IconArrowRight } from "@/components/icons";
import { AXIS_SPECS, AXES } from "@/lib/capability";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The entry screen. It states the mechanism rather than selling it: this is the
 * first thing a person with a disability sees, and a marketing page that talks
 * about them in the third person would fail the product's own principles.
 */
export default function Home() {
  return (
    <main className="graph-paper min-h-dvh">
      <div className="mx-auto max-w-[68rem] px-6 py-6 sm:px-10">
        <header className="flex items-center justify-between">
          <p className="font-mono text-[0.8125rem] tracking-[0.18em] uppercase">Axis</p>
          <ThemeToggle />
        </header>

        <div className="mt-16 max-w-[38rem] sm:mt-24">
          <h1 className="font-[family-name:var(--font-instrument-serif)] text-[clamp(2.75rem,7vw,4.5rem)] leading-[0.98] tracking-[-0.02em] text-balance">
            Your capabilities are the input, not a setting.
          </h1>

          <p className="mt-7 max-w-[34rem] text-[1.0625rem] leading-[1.6] text-[var(--ink-2)]">
            One profile, plotted by you, decides two things most software decides
            for you: how you prove who you are, and what the interface becomes
            once you&rsquo;re in.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <ButtonLink href="/profile" className="h-12">
              Plot your profile
              <IconArrowRight width={18} height={18} />
            </ButtonLink>
            <p className="font-mono text-[0.75rem] text-[var(--ink-2)]">5 axes &middot; about 90 seconds</p>
          </div>
        </div>

        <div className="mt-20 sm:mt-24">
          <Rule major />
          <div className="grid gap-x-10 gap-y-9 py-9 sm:grid-cols-3">
            <Mechanism
              n="Verification"
              body="A liveness check that asks you to turn your head isn't offered to someone who can't turn their head. The profile picks a modality you can actually finish."
            />
            <Mechanism
              n="Attestation"
              body="Your provider can corroborate the profile over a consented, field-scoped query — so it's a credential, not a claim."
            />
            <Mechanism
              n="Interface"
              body="The UI is generated from the profile. Two people see genuinely different screens over the same data, and both finish the task."
            />
          </div>
          <Rule major />
        </div>

        <div className="mt-9 flex flex-wrap items-end justify-between gap-6">
          <div>
            <PlotLabel>Axes on file</PlotLabel>
            <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {AXES.map((axis) => (
                <li key={axis} className="font-mono text-[0.8125rem]">
                  {AXIS_SPECS[axis].title}
                </li>
              ))}
            </ul>
          </div>
          <SimulatedBadge>Prototype &middot; simulated data throughout</SimulatedBadge>
        </div>

        <Annotation className="mt-6 max-w-[34rem]">
          Nothing here reaches a real identity service or a real medical record.
          Every profile, post and verification result is fixture data.
        </Annotation>

        <div className="h-16" />
      </div>
    </main>
  );
}

function Mechanism({ n, body }: { n: string; body: string }) {
  return (
    <div>
      <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[var(--plot)]">{n}</h2>
      <p className="mt-2.5 text-[0.9375rem] leading-[1.55] text-[var(--ink-2)]">{body}</p>
    </div>
  );
}
