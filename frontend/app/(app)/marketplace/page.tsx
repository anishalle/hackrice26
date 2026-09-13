"use client";

import { useMemo, useState } from "react";
import {
  CATEGORIES,
  CATEGORY_TONE,
  featuredSkills,
  SKILLS,
  type Skill,
} from "@/lib/skills";
import {
  CATEGORY_ICONS,
  IconChevronDown,
  IconChevronUp,
  IconSearch,
} from "@/components/icons";

/**
 * The marketplace, translated from the phone app.
 *
 * Skills are ranked by karma and authored by handle, because the thing being
 * browsed is other people's work rather than a catalogue a company wrote. The
 * featured rail is horizontal and the rest is a two-up grid, which is the phone
 * app's split: three things worth interrupting you for, then everything else.
 */

const FILTERS = ["All", ...CATEGORIES] as const;

export default function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<string>("All");
  const [added, setAdded] = useState<string[]>([]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SKILLS.filter((s) => {
      const matchesFilter = filter === "All" || s.tags.includes(filter as never);
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.author.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [query, filter]);

  const toggle = (id: string) =>
    setAdded((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <>
      <h1 className="text-[2.25rem] font-light leading-tight tracking-[-0.02em]">
        Marketplace
      </h1>
      <p className="mt-2 text-[1rem] leading-snug text-[var(--text-2)]">
        Agent skills the community built. Add one and Axl runs it for you.
      </p>

      <div className="relative mt-6">
        <IconSearch
          width={19}
          height={19}
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[var(--text-3)]"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills"
          aria-label="Search skills"
          className="target w-full rounded-[var(--r-pill)] py-3.5 pl-13 pr-5 text-[1rem] outline-none placeholder:text-[var(--text-3)]"
          style={{ backgroundColor: "var(--surface)", paddingLeft: "3.25rem" }}
        />
      </div>

      <div className="mt-4 -mx-5 flex gap-2 overflow-x-auto px-5 pb-2">
        {FILTERS.map((f) => {
          const on = f === filter;
          return (
            <button
              key={f}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f)}
              className="btn-lift target shrink-0 rounded-[var(--r-pill)] px-5 text-[0.9375rem] font-medium"
              style={{
                backgroundColor: on ? "var(--signal-mint)" : "var(--surface)",
                color: "var(--text)",
              }}
            >
              {f}
            </button>
          );
        })}
      </div>

      {filter === "All" && !query && (
        <section className="mt-7">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">Featured</h2>
          <div className="mt-4 -mx-5 flex gap-3 overflow-x-auto px-5 pb-2">
            {featuredSkills().map((s) => (
              <FeaturedCard
                key={s.id}
                skill={s}
                added={added.includes(s.id)}
                onToggle={() => toggle(s.id)}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mt-7">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[1.125rem] font-semibold tracking-[-0.01em]">All skills</h2>
          <span className="font-mono text-[0.9375rem] tabular-nums text-[var(--text-3)]">
            {visible.length}
          </span>
        </div>

        {visible.length === 0 ? (
          <p className="mt-5 text-[0.9375rem] text-[var(--text-2)]">
            Nothing matches that yet. Try a different word, or clear the filter.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {visible.map((s) => (
              <li key={s.id}>
                <SkillCard skill={s} added={added.includes(s.id)} onToggle={() => toggle(s.id)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function FeaturedCard({
  skill,
  added,
  onToggle,
}: {
  skill: Skill;
  added: boolean;
  onToggle: () => void;
}) {
  const Glyph = CATEGORY_ICONS[skill.tags[0]];
  return (
    <article
      className="flex shrink-0 flex-col justify-between rounded-[var(--r)] p-5"
      style={{
        width: 300,
        backgroundColor: `var(--signal-${CATEGORY_TONE[skill.tags[0]]})`,
        color: "var(--text)",
      }}
    >
      <div>
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-full"
          style={{ backgroundColor: "var(--surface)", width: 42, height: 42 }}
        >
          <Glyph width={20} height={20} />
        </span>
        <h3 className="mt-5 text-[1.1875rem] font-semibold tracking-[-0.01em]">
          {skill.title}
        </h3>
        <p className="mt-2 text-[0.9375rem] leading-snug">{skill.description}</p>
      </div>

      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-[0.875rem] opacity-70">{skill.author}</span>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={added}
          className="btn-lift target inline-flex items-center rounded-[var(--r-pill)] px-6 text-[0.9375rem] font-semibold"
          style={{
            backgroundColor: added ? "var(--surface)" : "var(--solid)",
            color: added ? "var(--text)" : "var(--solid-ink)",
          }}
        >
          {added ? "Added" : "Add"}
        </button>
      </div>
    </article>
  );
}

function SkillCard({
  skill,
  added,
  onToggle,
}: {
  skill: Skill;
  added: boolean;
  onToggle: () => void;
}) {
  const Glyph = CATEGORY_ICONS[skill.tags[0]];
  return (
    <article className="axl-tile flex h-full flex-col p-4">
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full"
        style={{
          backgroundColor: `var(--signal-${CATEGORY_TONE[skill.tags[0]]})`,
          width: 34,
          height: 34,
        }}
      >
        <Glyph width={16} height={16} />
      </span>

      <h3 className="mt-3.5 text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em]">
        {skill.title}
      </h3>
      <p className="mt-0.5 text-[0.875rem] text-[var(--text-3)]">{skill.author}</p>
      <p className="mt-2 line-clamp-3 flex-1 text-[0.9375rem] leading-snug text-[var(--text-2)]">
        {skill.description}
      </p>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <span
          className="rounded-[var(--r-pill)] px-2.5 py-1 text-[0.8125rem] font-medium"
          style={{ backgroundColor: `var(--signal-${CATEGORY_TONE[skill.tags[0]]})` }}
        >
          {skill.tags[0]}
        </span>

        {/* Karma, with its two directions. Real controls rather than a glyph:
            the count is the community's signal and voting on it is the whole
            reason the marketplace is other people's work and not a catalogue. */}
        <span className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Upvote ${skill.title}`}
            onClick={onToggle}
            className="inline-flex h-7 w-5 items-center justify-center text-[var(--text-3)] hover:text-[var(--text)]"
          >
            <IconChevronUp width={15} height={15} />
          </button>
          <span className="font-mono text-[0.875rem] tabular-nums">
            {skill.karma + (added ? 1 : 0)}
          </span>
          <button
            type="button"
            aria-label={`Downvote ${skill.title}`}
            className="inline-flex h-7 w-5 items-center justify-center text-[var(--text-3)] hover:text-[var(--text)]"
          >
            <IconChevronDown width={15} height={15} />
          </button>
        </span>
      </div>
    </article>
  );
}
