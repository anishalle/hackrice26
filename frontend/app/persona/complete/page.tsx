"use client";

import { ProtectedRoute } from "@/components/protected-route";
import { ButtonLink, Panel, PlotLabel } from "@/components/primitives";
import { IconArrowRight, IconCheck } from "@/components/icons";

function PersonaComplete() {
  return (
    <main className="paper min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[34rem] items-center px-[var(--pad-x)] py-6">
        <div>
          <IconCheck width={52} height={52} className="text-[var(--accent)]" aria-hidden />
          <PlotLabel className="mt-8">Persona</PlotLabel>
          <h1 className="mt-3 display-sm text-[clamp(2rem,7vw,3rem)]">You&rsquo;re all set.</h1>
          <p className="prose-lg mt-5 text-[var(--text-2)]">Aide is ready when you are.</p>
          <Panel className="mt-8 p-5 text-sm leading-6 text-[var(--text-2)]">
            This sandbox return confirms that the Persona journey came back to Aide. Identity results are not stored in this demo.
          </Panel>
          <ButtonLink href="/home" className="mt-8 h-12">
            Continue to Aide <IconArrowRight width={18} height={18} />
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}

export default function PersonaCompletePage() {
  return <ProtectedRoute><PersonaComplete /></ProtectedRoute>;
}
