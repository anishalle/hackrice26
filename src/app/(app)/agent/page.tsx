"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AXES, AXIS_SPECS, type Axis } from "@/lib/capability";
import { AGENT_TASKS, type AgentTask } from "@/lib/fixtures";
import { useSession } from "@/lib/session";
import { Annotation, Button, Panel, Rule } from "@/components/ui";
import { VoiceStage } from "@/components/voice-stage";
import { IconAgent, IconArrowRight, IconCheck, IconMic } from "@/components/icons";

type RunState = "idle" | "running" | "done";

/**
 * The assistive half. Tasks are ordered by how much this person's profile says
 * they'd want to hand off, and each names the axis that makes it worth
 * delegating — the agent explains why it is offering, not just what.
 */
export default function AgentPage() {
  const { profile, adaptation, hydrated } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  const relevantAxes = useMemo<Axis[]>(() => AXES.filter((a) => profile[a] < 3), [profile]);

  const tasks = useMemo(() => {
    const score = (t: AgentTask) => t.axes.filter((a) => relevantAxes.includes(a)).length;
    return [...AGENT_TASKS].sort((a, b) => score(b) - score(a));
  }, [relevantAxes]);

  const visible = adaptation.oneThingAtATime ? tasks.slice(0, 1) : tasks;

  if (adaptation.voiceFirst) {
    return (
      <VoiceStage
        label="Agent"
        emptyLabel="No tasks available."
        items={tasks.map((t) => ({
          id: t.id,
          meta: t.duration,
          title: t.title,
          body: t.detail,
        }))}
      />
    );
  }

  return (
    <div>
      <div className="max-w-[36rem]">
        <h1 className="display-sm text-[clamp(1.875rem,4vw,2.75rem)] text-balance">
          Hand it the parts that used to be fast.
        </h1>
        <p className="mt-4 text-[0.9375rem] leading-[1.6] text-[var(--text-2)]">
          {hydrated && adaptation.voiceInputUnavailable
            ? "Every task here is startable without speaking — your profile says voice input isn't a route we should rely on."
            : "Start any of these by tapping, or hold anywhere on the page and just say it."}
        </p>
      </div>

      <div className="mt-10 grid gap-4">
        {visible.map((task, i) => (
          <motion.div
            key={task.id}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: animate ? Math.min(i, 4) * 0.04 : 0, ease: [0.16, 1, 0.3, 1] }}
          >
            <TaskRow task={task} relevantAxes={relevantAxes} animate={animate} />
          </motion.div>
        ))}
      </div>

      <div className="mt-10">
        <Rule />
        <div className="mt-5 flex gap-3">
          <IconMic width={17} height={17} className="mt-0.5 shrink-0 text-[var(--text-2)]" />
          <p className="max-w-[40rem] text-[0.875rem] leading-[1.6] text-[var(--text-2)]">
            In voice-first mode the agent is not a tab — it&rsquo;s how the whole
            app is operated. It reads the feed aloud, drafts replies in your
            voice, and posts them when you say go.
          </p>
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  relevantAxes,
  animate,
}: {
  task: AgentTask;
  relevantAxes: Axis[];
  animate: boolean;
}) {
  const [state, setState] = useState<RunState>("idle");
  const matches = task.axes.filter((a) => relevantAxes.includes(a));

  function start() {
    setState("running");
    window.setTimeout(() => setState("done"), 1400);
  }

  return (
    <Panel as="article" className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <IconAgent width={17} height={17} className="shrink-0 text-[var(--text-2)]" />
            <h2 className="text-[1.0625rem] font-medium">{task.title}</h2>
          </div>
          <p className="mt-2 text-[0.9375rem] leading-[1.55] text-[var(--text-2)]" style={{ maxWidth: "62ch" }}>
            {task.detail}
          </p>
          <p className="mt-2.5 font-mono text-[0.75rem] text-[var(--text-2)]">{task.duration}</p>

          {matches.length > 0 && (
            <Annotation className="mt-3">
              offered because of your{" "}
              {matches.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(" and ")} axis
            </Annotation>
          )}
        </div>

        <div className="shrink-0">
          <AnimatePresence mode="wait" initial={false}>
            {state === "done" ? (
              <motion.p
                key="done"
                initial={animate ? { opacity: 0, scale: 0.96 } : false}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className="inline-flex h-11 items-center gap-2 px-2 font-mono text-[0.8125rem]"
                style={{ color: "var(--accent)" }}
              >
                <IconCheck width={17} height={17} />
                Started
              </motion.p>
            ) : (
              <motion.div key="idle" exit={animate ? { opacity: 0 } : undefined}>
                <Button
                  variant="secondary"
                  onClick={start}
                  disabled={state === "running"}
                  className="h-11"
                >
                  {state === "running" ? "Starting…" : "Hand off"}
                  {state === "idle" && <IconArrowRight width={17} height={17} />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Panel>
  );
}
