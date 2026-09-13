"use client";

import { useMemo, useState } from "react";
import {
  Captions,
  Check,
  CircleHelp,
  Ear,
  Eye,
  Hand,
  Keyboard,
  Loader2,
  MessageSquareText,
  Mic,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  type AccessibilityPreferences,
  type InputMethod,
  type InteractionMode,
  type OutputMethod,
} from "@/lib/accessibility";
import { cn } from "@/lib/utils";

const INPUT_OPTIONS: Array<{ value: InputMethod; label: string; Icon: typeof Keyboard }> = [
  { value: "text", label: "Text", Icon: MessageSquareText },
  { value: "voice", label: "Voice", Icon: Mic },
  { value: "keyboard", label: "Keyboard", Icon: Keyboard },
  { value: "screen_reader", label: "Screen reader", Icon: Eye },
  { value: "switch", label: "Switch", Icon: Hand },
];

const OUTPUT_OPTIONS: Array<{ value: OutputMethod; label: string; Icon: typeof Captions }> = [
  { value: "text", label: "Text", Icon: MessageSquareText },
  { value: "speech", label: "Read aloud", Icon: Volume2 },
  { value: "captions", label: "Captions", Icon: Captions },
  { value: "simplified_steps", label: "Simple steps", Icon: CircleHelp },
];

const MODE_OPTIONS: Array<{ value: InteractionMode; label: string; description: string }> = [
  { value: "guide", label: "Guide me", description: "I explain; you act." },
  { value: "assist", label: "Assist me", description: "I handle safe navigation." },
  { value: "together", label: "Do it with me", description: "We take one action at a time." },
];

const DEMO_STEPS = [
  "I found the account page. Open the accessibility settings section.",
  "The page has three options. Choose the one that matches what you want to do.",
  "You are ready to review the result. Nothing will be submitted without your approval.",
];

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function AccessibilityConsole({
  initialPreferences,
}: {
  initialPreferences: AccessibilityPreferences;
}) {
  const { updateAccessibilityPreferences } = useAuth();
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(initialPreferences);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  const currentStep = DEMO_STEPS[step];
  const transcriptLabel = useMemo(
    () => (preferences.outputMethods.includes("captions") ? "Live transcript" : "Agent response"),
    [preferences.outputMethods]
  );

  function update(patch: Partial<AccessibilityPreferences>) {
    setPreferences((current) => ({ ...current, ...patch }));
    setSaved(false);
  }

  function speak() {
    if (!("speechSynthesis" in window)) {
      setMessage("Read-aloud is not available in this browser. The full text remains on screen.");
      return;
    }
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(currentStep));
  }

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await updateAccessibilityPreferences(preferences);
      setSaved(true);
      setMessage("Your interaction preferences are saved.");
    } catch {
      setMessage("We could not save these preferences yet. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const targetClass = preferences.largeTargets ? "min-h-12 text-base" : "min-h-9 text-sm";

  return (
    <section aria-labelledby="accessibility-console-title" className="grid gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <aside className="rounded-xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Ear className="size-4 text-primary" />
          Your interaction preferences
        </div>
        <h2 id="accessibility-console-title" className="mt-2 text-xl font-bold tracking-tight">
          Make the agent work your way.
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Choose how you want to communicate. You can use more than one method.
        </p>

        <PreferenceGroup label="How I give input">
          {INPUT_OPTIONS.map(({ value, label, Icon }) => (
            <ChoiceButton
              key={value}
              active={preferences.inputMethods.includes(value)}
              className={targetClass}
              onClick={() => update({ inputMethods: toggleValue(preferences.inputMethods, value) })}
            >
              <Icon className="size-4" />
              {label}
            </ChoiceButton>
          ))}
        </PreferenceGroup>

        <PreferenceGroup label="How I receive output">
          {OUTPUT_OPTIONS.map(({ value, label, Icon }) => (
            <ChoiceButton
              key={value}
              active={preferences.outputMethods.includes(value)}
              className={targetClass}
              onClick={() => update({ outputMethods: toggleValue(preferences.outputMethods, value) })}
            >
              <Icon className="size-4" />
              {label}
            </ChoiceButton>
          ))}
        </PreferenceGroup>

        <PreferenceGroup label="How I help">
          <div className="grid gap-2">
            {MODE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={preferences.mode === option.value}
                onClick={() => update({ mode: option.value })}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  preferences.mode === option.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                )}
              >
                <span className="block text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </PreferenceGroup>

        <label className="mt-5 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={preferences.oneStepAtATime}
            onChange={(event) => update({ oneStepAtATime: event.target.checked })}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="block font-medium">One step at a time</span>
            <span className="text-xs leading-5 text-muted-foreground">Keep instructions focused and predictable.</span>
          </span>
        </label>

        <label className="mt-4 flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={preferences.largeTargets}
            onChange={(event) => update({ largeTargets: event.target.checked })}
            className="mt-0.5 size-4 accent-primary"
          />
          <span>
            <span className="block font-medium">Larger controls</span>
            <span className="text-xs leading-5 text-muted-foreground">Increase target size for easier selection.</span>
          </span>
        </label>

        <Button className="mt-6 w-full" onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          {saving ? "Saving…" : saved ? "Saved" : "Save preferences"}
        </Button>
        {message && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}
      </aside>

      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Guided session preview</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              {preferences.mode === "guide" ? "Guide me" : preferences.mode === "assist" ? "Assist me" : "Do it with me"}
            </h2>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Step {step + 1} of {DEMO_STEPS.length}
          </span>
        </div>

        <div className="mt-8 rounded-xl border bg-muted/30 p-5 sm:p-7">
          <p className="text-sm font-medium">{transcriptLabel}</p>
          <p aria-live="polite" className={cn("mt-3 max-w-2xl leading-8", preferences.largeTargets ? "text-xl" : "text-lg")}>
            {currentStep}
          </p>
          {preferences.outputMethods.includes("speech") && (
            <Button variant="outline" className={cn("mt-5", targetClass)} onClick={speak}>
              <Volume2 className="size-4" />
              Read this aloud
            </Button>
          )}
        </div>

        {preferences.oneStepAtATime ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Button className={targetClass} onClick={() => setStep((current) => Math.min(current + 1, DEMO_STEPS.length - 1))} disabled={step === DEMO_STEPS.length - 1}>
              <Play className="size-4" />
              Continue
            </Button>
            <Button variant="outline" className={targetClass} onClick={speak}>
              <RotateCcw className="size-4" />
              Repeat
            </Button>
          </div>
        ) : (
          <ol className="mt-6 grid gap-3" aria-label="All guidance steps">
            {DEMO_STEPS.map((item, index) => (
              <li key={item} className="flex gap-3 text-sm leading-6">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                {item}
              </li>
            ))}
          </ol>
        )}

        {preferences.inputMethods.includes("voice") && (
          <p className="mt-6 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Voice input is selected. Hermes will receive a transcript when voice recognition is connected; text remains available as a fallback.
          </p>
        )}
      </div>
    </section>
  );
}

function PreferenceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <fieldset className="mt-6">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
    </fieldset>
  );
}

function ChoiceButton({ active, className, children, onClick }: { active: boolean; className: string; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-muted",
        className
      )}
    >
      {children}
    </button>
  );
}
