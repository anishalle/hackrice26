import Link from "next/link";
import { IconArrowRight } from "./icons";

/**
 * The top disclosure bar.
 *
 * Persona runs an announcement strip across the top of every page; the same
 * slot here carries the one thing a viewer must not miss. Putting the
 * "nothing is real" disclosure in the most prominent chrome on the page —
 * rather than in a footnote — is the honest version of the pattern.
 */
export function Announce() {
  return (
    <div className="announce relative z-30">
      <div className="mx-auto flex max-w-[82rem] flex-wrap items-center justify-center gap-x-2 gap-y-1 px-6 py-2.5 text-center text-[0.8125rem] sm:px-10">
        <span className="font-medium">Prototype.</span>
        <span className="opacity-85">
          Simulated identity verification and a fictional provider — no real records.
        </span>
        <Link
          href="#how"
          className="inline-flex items-center gap-1 font-medium underline decoration-current/40 underline-offset-2 hover:decoration-current"
        >
          How it works
          <IconArrowRight width={14} height={14} />
        </Link>
      </div>
    </div>
  );
}
