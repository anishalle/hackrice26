"use client";

import { useState } from "react";
import Link from "next/link";
import { GazingAvatar } from "@/components/avatar-gaze";
import { useSession } from "@/lib/session";
import { IconArrowLeft, IconArrowRight, IconMic, IconPlus } from "@/components/icons";

/**
 * Axl: the agent, as a conversation.
 *
 * Translated from the phone app's chat screen. The shape carries an argument
 * about what an agent is allowed to be: the agent's turns are plain text with
 * no bubble, and only the person's own words get a container. An agent that
 * speaks in the same bubble as you are speaking in is presenting itself as a
 * peer in the conversation, and this one is a tool that answers.
 *
 * Two things sit under an answer that used data. The sources it drew on, named
 * rather than implied, and the actions it can take next. Both are the same
 * move: the agent showing its work before it is trusted to act.
 */

interface Turn {
  id: string;
  from: "axl" | "you";
  at: string;
  text: string;
  sources?: string[];
  actions?: string[];
}

export default function AgentPage() {
  const { patient, previewing } = useSession();
  const first = patient.name.split(" ")[0];

  const [turns, setTurns] = useState<Turn[]>([
    {
      id: "t1",
      from: "axl",
      at: "2:25 am",
      text: `Hi, I'm Axl.\n\nAsk me to handle something: a refill, a form, a ride. Or tell me how the week has gone and I will log it.`,
    },
  ]);
  const [draft, setDraft] = useState("");

  const send = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    setTurns((t) => [
      ...t,
      { id: `u${t.length}`, from: "you", at: "2:25 am", text },
      {
        id: `a${t.length}`,
        from: "axl",
        at: "2:25 am",
        text: `Start now, in short sittings rather than one long one. Your check-in audio already gives me 1,240 phrases, and your rate has been flat for three weeks, so there is room. I can add Voice Bank Builder and have it record whenever your voice is steady, so you never schedule a sitting.`,
        sources: ["Your check-ins", "Community skills", "ALS Association"],
        actions: ["Add Voice Bank Builder", "Show me my speech trend"],
      },
    ]);
  };

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col">
      <header className="flex items-center gap-3">
        <Link
          href="/feed"
          aria-label="Back"
          className="btn-lift target inline-flex items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface)", width: 44, height: 44 }}
        >
          <IconArrowLeft width={18} height={18} />
        </Link>

        <h1 className="flex-1 text-center text-[1.125rem] font-semibold tracking-[-0.01em]">
          Axl
        </h1>

        <span
          className="inline-flex items-center rounded-[var(--r-pill)] px-4 py-2 text-[0.9375rem] font-medium"
          style={{ backgroundColor: "var(--signal-mint)" }}
        >
          Gaze
        </span>
      </header>

      <div className="mt-8 flex-1">
        <ul className="grid gap-7">
          {turns.map((t) =>
            t.from === "axl" ? (
              <li key={t.id}>
                <div className="flex items-center gap-2.5">
                  <GazingAvatar
                    seed="axl-agent"
                    hue={250}
                    tone={0.6}
                    expression="idle"
                    size={34}
                    travel={5}
                    className="block shrink-0"
                  />
                  <span className="font-mono text-[0.8125rem] text-[var(--text-3)]">{t.at}</span>
                </div>

                <p className="mt-3 whitespace-pre-line text-[1.0625rem] leading-[1.55]">
                  {t.text}
                </p>

                {t.sources && (
                  <ul className="mt-4 flex flex-wrap gap-2">
                    {t.sources.map((s) => (
                      <li
                        key={s}
                        className="rounded-[var(--r-pill)] px-3.5 py-1.5 text-[0.875rem]"
                        style={{ backgroundColor: "var(--surface)" }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}

                {t.actions && (
                  <ul className="mt-3 grid justify-end gap-2.5">
                    {t.actions.map((a) => (
                      <li key={a}>
                        <button
                          type="button"
                          className="btn-lift target inline-flex items-center gap-3 rounded-[var(--r-pill)] px-5 text-[1rem] font-medium"
                          style={{ backgroundColor: "var(--surface)" }}
                        >
                          {a}
                          <IconArrowRight width={17} height={17} className="text-[var(--text-3)]" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ) : (
              <li key={t.id} className="flex justify-end">
                <p
                  className="max-w-[80%] rounded-[1.5rem] px-5 py-3 text-[1.0625rem] leading-snug"
                  style={{ backgroundColor: "var(--solid)", color: "var(--solid-ink)" }}
                >
                  {t.text}
                </p>
              </li>
            ),
          )}
        </ul>
      </div>

      {/* Sits above the tab bar rather than pinned to the bottom of the window,
          because the tab bar is already floating there. */}
      <form onSubmit={send} className="sticky bottom-28 mt-8">
        <div
          className="flex items-center gap-2 rounded-[var(--r-pill)] py-2 pl-4 pr-2"
          style={{ backgroundColor: "var(--surface)", boxShadow: "0 6px 18px rgb(21 21 21 / 7%)" }}
        >
          <button
            type="button"
            aria-label="Attach"
            className="target inline-flex items-center justify-center text-[var(--text-3)]"
          >
            <IconPlus width={19} height={19} />
          </button>

          <label className="sr-only" htmlFor="axl-message">
            Message Axl
          </label>
          <input
            id="axl-message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={previewing ? `Message Axl as ${first}` : "Message Axl"}
            className="min-w-0 flex-1 bg-transparent py-2 text-[1.0625rem] outline-none placeholder:text-[var(--text-3)]"
          />

          <button
            type="submit"
            aria-label="Send"
            className="btn-lift inline-flex shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--solid)", color: "var(--solid-ink)", width: 44, height: 44 }}
          >
            <IconMic width={19} height={19} />
          </button>
        </div>
      </form>
    </div>
  );
}
