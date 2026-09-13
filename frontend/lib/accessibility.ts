export const INPUT_METHODS = ["text", "voice", "keyboard", "screen_reader", "switch"] as const;
export const OUTPUT_METHODS = ["text", "speech", "captions", "simplified_steps"] as const;
export const INTERACTION_MODES = ["guide", "assist", "together"] as const;

export type InputMethod = (typeof INPUT_METHODS)[number];
export type OutputMethod = (typeof OUTPUT_METHODS)[number];
export type InteractionMode = (typeof INTERACTION_MODES)[number];

export interface AccessibilityPreferences {
  inputMethods: InputMethod[];
  outputMethods: OutputMethod[];
  mode: InteractionMode;
  oneStepAtATime: boolean;
  largeTargets: boolean;
}

export const DEFAULT_ACCESSIBILITY_PREFERENCES: AccessibilityPreferences = {
  inputMethods: ["text"],
  outputMethods: ["text"],
  mode: "guide",
  oneStepAtATime: true,
  largeTargets: false,
};

export function isAccessibilityPreferences(value: unknown): value is AccessibilityPreferences {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AccessibilityPreferences>;
  return (
    Array.isArray(candidate.inputMethods) &&
    Array.isArray(candidate.outputMethods) &&
    INTERACTION_MODES.includes(candidate.mode as InteractionMode) &&
    typeof candidate.oneStepAtATime === "boolean" &&
    typeof candidate.largeTargets === "boolean"
  );
}
