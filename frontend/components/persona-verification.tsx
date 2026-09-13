"use client";

import { useEffect, useState } from "react";
import { openPersona, preparePersona, type PersonaJourney } from "@/lib/persona";
import { Button, Panel, PlotLabel } from "@/components/primitives";
import { IconArrowLeft, IconArrowRight, IconCheck, IconShield } from "@/components/icons";

type Status = "preparing" | "ready" | "opening" | "error";

export function PersonaVerification({
  onBack,
  returnPath,
}: {
  onBack: () => void;
  returnPath?: string;
}) {
  const [status, setStatus] = useState<Status>("preparing");
  const [journey, setJourney] = useState<PersonaJourney | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function prepare() {
    setStatus("preparing");
    setError(null);
    try {
      const next = await preparePersona(returnPath);
      setJourney(next);
      setStatus("ready");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start Persona.");
      setStatus("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void preparePersona(returnPath).then((next) => {
      if (!cancelled) {
        setJourney(next);
        setStatus("ready");
      }
    }).catch((caught) => {
      if (!cancelled) {
        setError(caught instanceof Error ? caught.message : "Unable to start Persona.");
        setStatus("error");
      }
    });
    return () => { cancelled = true; };
  }, [returnPath]);

  function continueToPersona() {
    if (!journey) return;
    setStatus("opening");
    openPersona(journey);
  }

  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[34rem] flex-col px-[var(--pad-x)] py-6">
        <button type="button" onClick={onBack} disabled={status === "opening"}
          className="target -ml-3 inline-flex w-fit items-center gap-2 px-3 font-mono text-[0.8125rem] tracking-[0.18em] uppercase text-[var(--text-2)] hover:text-[var(--text)] disabled:opacity-50">
          <IconArrowLeft width={16} height={16} />
          Back
        </button>

        <div className="my-auto py-16">
          {status === "ready" ? (
            <IconShield width={52} height={52} className="text-[var(--brand)]" aria-hidden />
          ) : status === "error" ? (
            <IconShield width={52} height={52} className="text-[var(--text-2)]" aria-hidden />
          ) : (
            <span className="block h-[52px] w-[52px] animate-pulse rounded-full bg-[var(--brand-dim)]" aria-hidden />
          )}
          <PlotLabel className="mt-8">Identity verification</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,7vw,3rem)]">
            {status === "error" ? "Persona could not open." : "Just one more thing."}
          </h1>
          <p className="prose-lg mt-5 max-w-[30rem] text-[var(--text-2)]">
            {status === "error"
              ? "Your Aide sign-in is still active. You can try preparing the verification journey again."
              : "A quick stop at Persona, then back to Aide."}
          </p>

          {error && <p role="alert" className="mt-5 max-w-[30rem] text-sm text-[var(--text-2)]">{error}</p>}

          <Panel className="mt-9 p-5">
            <div className="flex gap-3">
              <IconCheck width={18} height={18} className="mt-0.5 shrink-0 text-[var(--accent)]" aria-hidden />
              <p className="text-sm leading-6 text-[var(--text-2)]">
                Persona opens in this tab. After the sandbox journey, it returns you to Aide.
              </p>
            </div>
          </Panel>

          <div className="mt-8">
            {status === "error" ? (
              <Button onClick={() => void prepare()} className="h-12">
                Try again
                <IconArrowRight width={18} height={18} />
              </Button>
            ) : (
              <Button onClick={continueToPersona} disabled={status !== "ready"} className="h-12">
                {status === "preparing" ? "Getting ready…" : status === "opening" ? "Opening Persona…" : "Continue with Persona"}
                {status === "ready" && <IconArrowRight width={18} height={18} />}
              </Button>
            )}
          </div>
          <p className="mt-5 font-mono text-xs text-[var(--text-3)]">Sandbox demo · No identity result is saved in Aide.</p>
        </div>
      </div>
    </main>
  );
}
