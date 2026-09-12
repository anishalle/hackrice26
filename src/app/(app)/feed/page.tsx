"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AXES, AXIS_SPECS, type Axis } from "@/lib/capability";
import { AUTHORS, POSTS, type Post } from "@/lib/fixtures";
import { useSession } from "@/lib/session";
import { Annotation, Button, Panel, Rule } from "@/components/ui";
import { VoiceStage } from "@/components/voice-stage";
import { IconCheck, IconComment, IconSolved } from "@/components/icons";

/**
 * The social half.
 *
 * Sorted by relevance to the reader's own profile rather than by recency — the
 * value of this network is that someone plotted like you already solved this.
 */
export default function FeedPage() {
  const { profile, adaptation, hydrated } = useSession();
  const reduce = useReducedMotion();
  const animate = !reduce && !adaptation.reduceMotion;

  // Axes where the reader needs support are the axes whose posts matter.
  const relevantAxes = useMemo<Axis[]>(() => AXES.filter((a) => profile[a] < 3), [profile]);

  const posts = useMemo(() => {
    const score = (p: Post) => p.axes.filter((a) => relevantAxes.includes(a)).length;
    return [...POSTS].sort((a, b) => score(b) - score(a) || b.worked - a.worked);
  }, [relevantAxes]);

  // One decision per screen when the pace axis asks for it.
  const visible = adaptation.oneThingAtATime ? posts.slice(0, 1) : posts;

  // Non-visual profiles get a different interface, not a bigger one.
  if (adaptation.voiceFirst) {
    return (
      <VoiceStage
        label="Feed"
        emptyLabel="Nothing in the feed yet."
        items={posts.map((p) => ({
          id: p.id,
          meta: `${AUTHORS[p.authorId].name} · ${p.ago} · ${p.worked} say it worked`,
          title: p.problem,
          body: p.solution,
        }))}
      />
    );
  }

  return (
    <div>
      <div className="max-w-[36rem]">
        <h1 className="display-sm text-[clamp(1.875rem,4vw,2.75rem)] text-balance">
          How people plotted like you are solving it.
        </h1>
        {hydrated && relevantAxes.length > 0 ? (
          <Annotation className="mt-4">
            sorted by overlap with your profile &mdash;{" "}
            {relevantAxes.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(", ")}
          </Annotation>
        ) : (
          <p className="mt-4 text-[0.9375rem] leading-[1.6] text-[var(--text-2)]">
            Sorted by how many people it worked for. Set an axis on your profile
            and this reorders around what you actually need.
          </p>
        )}
      </div>

      <div className="mt-10 grid gap-5">
        {visible.map((post, i) => (
          <motion.div
            key={post.id}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, delay: animate ? Math.min(i, 4) * 0.04 : 0, ease: [0.16, 1, 0.3, 1] }}
          >
            <PostCard post={post} relevantAxes={relevantAxes} dense={adaptation.density !== "full"} />
          </motion.div>
        ))}
      </div>

      {adaptation.oneThingAtATime && posts.length > 1 && (
        <div className="mt-6">
          <Annotation>
            {posts.length - 1} more waiting. Your pace setting shows one at a time.
          </Annotation>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  relevantAxes,
  dense,
}: {
  post: Post;
  relevantAxes: Axis[];
  dense: boolean;
}) {
  const author = AUTHORS[post.authorId];
  const [open, setOpen] = useState(false);
  const [worked, setWorked] = useState(false);
  const matches = post.axes.filter((a) => relevantAxes.includes(a));

  return (
    <Panel as="article" className="p-6 sm:p-7">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.9375rem] font-medium">{author.name}</span>
        {author.attested.length > 0 && (
          <span
            className="inline-flex items-center gap-1 font-mono text-[0.6875rem] uppercase tracking-[0.08em]"
            style={{ color: "var(--accent)" }}
            title={`${author.attested.map((a) => AXIS_SPECS[a].title).join(", ")} attested by a provider`}
          >
            <IconCheck width={12} height={12} />
            attested
          </span>
        )}
        <span className="font-mono text-[0.75rem] text-[var(--text-2)]">{post.ago}</span>
        {matches.length > 0 && (
          <span className="ml-auto font-mono text-[0.6875rem] uppercase tracking-[0.08em] text-[var(--brand)]">
            matches your {matches.map((a) => AXIS_SPECS[a].title.toLowerCase()).join(" + ")}
          </span>
        )}
      </div>

      <h2 className="mt-4 text-[1.125rem] font-medium leading-[1.35] text-balance">{post.problem}</h2>

      <p className="mt-3 text-[0.9375rem] leading-[1.65] text-[var(--text-2)]" style={{ maxWidth: "70ch" }}>
        {post.solution}
      </p>

      {!dense && <Rule className="mt-5" />}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button
          variant="quiet"
          onClick={() => setWorked((w) => !w)}
          aria-pressed={worked}
          className="h-10 px-3 text-[0.8125rem]"
          style={worked ? { color: "var(--accent)" } : undefined}
        >
          <IconSolved width={16} height={16} />
          <span className="tabular-nums">{post.worked + (worked ? 1 : 0)}</span>
          <span>worked for them</span>
        </Button>

        {post.comments.length > 0 && (
          <Button
            variant="quiet"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="h-10 px-3 text-[0.8125rem]"
          >
            <IconComment width={16} height={16} />
            <span className="tabular-nums">{post.comments.length}</span>
            <span>{open ? "hide replies" : "replies"}</span>
          </Button>
        )}
      </div>

      {open && post.comments.length > 0 && (
        <ul className="mt-4 grid gap-4 border-l pl-5" style={{ borderColor: "var(--line)" }}>
          {post.comments.map((c) => (
            <li key={c.id}>
              <div className="flex flex-wrap items-baseline gap-x-2.5">
                <span className="text-[0.875rem] font-medium">{AUTHORS[c.authorId].name}</span>
                <span className="font-mono text-[0.6875rem] text-[var(--text-2)]">{c.ago}</span>
              </div>
              <p className="mt-1 text-[0.875rem] leading-[1.6] text-[var(--text-2)]" style={{ maxWidth: "68ch" }}>
                {c.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
