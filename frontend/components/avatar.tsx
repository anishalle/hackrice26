"use client";

import { Blobatar } from "@blobatar/react";
import { happy, idle, mad, sad, surprised } from "blobatar/expression";
import { useSession, type ExpressionId } from "@/lib/session";
import { useAuth } from "@/lib/auth-context";
import "blobatar/motion.css";

/** The library ships expressions as values to import, not strings to pass, so
 *  the session's serialisable id is mapped back to one here. */
export const EXPRESSIONS = { idle, happy, sad, mad, surprised } as const;

/**
 * A deterministic avatar, from blobatar.dev.
 *
 * The face is a pure function of its seed plus three optional overrides, so a
 * person is the same creature on every surface with four small values stored
 * and no image uploaded anywhere. The overrides are deliberately narrow — hue,
 * tone, expression — so every result is still a face the generator would have
 * produced, and nobody can dial their way to something that stands apart from
 * everyone else on the wall.
 *
 * Accessibility is the reason `label` is optional rather than required.
 * Alongside a visible name — a feed byline, a comment author — the face
 * carries nothing the name does not already say, so it stays decorative and
 * screen readers skip past it to the name. Standing alone, as in the app nav,
 * it is the only thing identifying the account and has to be announced. The
 * library branches on `title` for exactly this: absent, it renders
 * `aria-hidden`; present, it renders `role="img"` with a `<title>`.
 *
 * Motion needs nothing special here. The library's stylesheet already stops on
 * `prefers-reduced-motion`, and the app's own profile-driven setting is caught
 * by the `[data-motion="reduced"] *` rule in globals.css — which matters,
 * because someone can ask for reduced motion in their capability profile
 * without having ever set it at the OS level.
 */
export function Avatar({
  seed,
  size = 32,
  label,
  animate = "hover",
  hue,
  tone,
  expression,
  className,
}: AvatarProps) {
  return (
    <Blobatar
      name={seed}
      size={size}
      animate={animate}
      background={false}
      title={label}
      // Undefined rather than null: the library reads these with `??`, so null
      // would be treated as a set value and pin the ramp instead of letting the
      // seed decide.
      hue={hue ?? undefined}
      tone={tone ?? undefined}
      expression={expression ? EXPRESSIONS[expression] : undefined}
      className={className}
    />
  );
}

/**
 * The signed-in visitor's face, resolved once so every surface agrees.
 *
 * Before anyone has been through the customiser the seed comes from the
 * account, so two signed-in people still look different from each other rather
 * than both getting the placeholder. The moment they choose, their choice wins
 * and stops tracking the account — otherwise changing your email would silently
 * change your face.
 */
export function useAvatarChoice(): AvatarProps {
  const { avatar, avatarChosen } = useSession();
  const { user } = useAuth();
  return {
    seed: avatarChosen ? avatar.seed : (user?.email ?? user?.$id ?? avatar.seed),
    hue: avatar.hue,
    tone: avatar.tone,
    expression: avatar.expression,
  };
}

export type AvatarProps = {
  /** Any stable string. Same string in, same face out. */
  seed: string;
  size?: number;
  /** Omit next to a visible name; supply when the avatar stands alone. */
  label?: string;
  animate?: "hover" | "always";
  /** 0–360. Null or omitted lets the seed pick. */
  hue?: number | null;
  /** Null or omitted lets the seed pick. */
  tone?: number | null;
  expression?: ExpressionId;
  className?: string;
};
