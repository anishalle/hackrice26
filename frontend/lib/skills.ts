/**
 * The marketplace: agent skills, not articles.
 *
 * Every entry is a workflow the agent can run on someone's behalf, written once
 * by a person who worked out the steps and shared so nobody else has to. Ported
 * from the companion app's own catalogue rather than reinvented, so the same
 * skill carries the same author, karma and wording on both platforms. A skill
 * that read differently depending on which device you opened it on would make
 * the marketplace feel like two marketplaces.
 *
 * Icons are not stored here. They follow from the first tag, which keeps a new
 * skill from having to pick one and keeps the set visually closed.
 */

export const CATEGORIES = [
  "Speech",
  "Voice",
  "Mobility",
  "Daily",
  "Care",
  "Automation",
] as const;

export type Category = (typeof CATEGORIES)[number];

/** Each category maps to one of the four accents. Text is always ink. */
export const CATEGORY_TONE: Record<Category, "amber" | "mint" | "periwinkle" | "peach"> = {
  Speech: "amber",
  Voice: "peach",
  Mobility: "mint",
  Daily: "periwinkle",
  Care: "peach",
  Automation: "periwinkle",
};

export interface Skill {
  id: string;
  title: string;
  author: string;
  tags: Category[];
  karma: number;
  featured?: boolean;
  description: string;
}

export const SKILLS: Skill[] = [
  {
    id: "voice-bank",
    title: "Voice Bank Builder",
    author: "@sunay",
    tags: ["Voice", "Speech"],
    karma: 214,
    featured: true,
    description:
      "Runs your recording sittings, checks each take, and builds a speech voice that still sounds like you.",
  },
  {
    id: "refill-runner",
    title: "Refill Runner",
    author: "@sahas",
    tags: ["Care", "Automation"],
    karma: 186,
    featured: true,
    description:
      "Tracks every prescription, sits in the pharmacy queue for you, and only asks when something needs a decision.",
  },
  {
    id: "appeal-writer",
    title: "Insurance Appeal Writer",
    author: "@priya",
    tags: ["Care", "Automation"],
    karma: 171,
    featured: true,
    description:
      "Drafts the appeal from your denial letter and your own notes, in your words, ready for you to send.",
  },
  {
    id: "eye-gaze-tune",
    title: "Eye-Gaze Tune-Up",
    author: "@jordan",
    tags: ["Mobility", "Automation"],
    karma: 168,
    description:
      "Recalibrates gaze targets as your control changes, and grows the hit areas before you start missing them.",
  },
  {
    id: "ride-booker",
    title: "Ride Booker",
    author: "@sahas",
    tags: ["Mobility", "Daily"],
    karma: 141,
    description:
      "Books accessible transport, confirms the lift actually works, and re-books itself when a driver cancels.",
  },
  {
    id: "grocery-loop",
    title: "Grocery Loop",
    author: "@priya",
    tags: ["Daily", "Automation"],
    karma: 122,
    description:
      "Reorders your usual shop on your own rhythm and swaps in packaging you can still open one-handed.",
  },
  {
    id: "form-filler",
    title: "Form Filler",
    author: "@jules",
    tags: ["Daily", "Automation"],
    karma: 118,
    description:
      "Fills disability, grant and clinic forms from what the agent already knows, then reads the answers back before sending.",
  },
  {
    id: "care-roster",
    title: "Care Shift Roster",
    author: "@sahas",
    tags: ["Care"],
    karma: 97,
    description:
      "Builds the overnight turning and suctioning rota and asks the next person itself, so nobody has to chase.",
  },
  {
    id: "inbox-triage",
    title: "Inbox Triage",
    author: "@amina",
    tags: ["Automation", "Daily"],
    karma: 88,
    description:
      "Answers what it safely can in your voice, holds the rest, and reads you the short list once a day.",
  },
  {
    id: "switch-recipes",
    title: "Switch Control Recipes",
    author: "@jordan",
    tags: ["Automation", "Mobility"],
    karma: 76,
    description:
      "One-switch scanning setups for phone, lights and bed, retuned as movement narrows.",
  },
  {
    id: "clinic-brief",
    title: "Clinic Prep Brief",
    author: "@sunay",
    tags: ["Care", "Speech"],
    karma: 64,
    description:
      "Turns your check-ins into the two pages your clinic team reads before a visit, so nothing is recalled from memory.",
  },
  {
    id: "read-aloud",
    title: "Read-Aloud Replies",
    author: "@jules",
    tags: ["Speech", "Voice"],
    karma: 52,
    description:
      "Speaks your typed replies in your banked voice, with the phrases you use most kept one tap away.",
  },
  {
    id: "fatigue-pacer",
    title: "Fatigue Pacer",
    author: "@amina",
    tags: ["Daily", "Automation"],
    karma: 41,
    description:
      "Budgets the day into energy blocks and holds notifications until you have room for them.",
  },
];

/**
 * What people say about the skills they actually run, as opposed to what the
 * listing claims. The home screen leads with these rather than the catalogue
 * copy: a first-person sentence about a pharmacy queue is a better argument for
 * a skill than its own description is.
 */
export interface SkillNote {
  id: string;
  skillId: string;
  tag: Category;
  title: string;
  note: string;
  author: string;
}

export const SKILL_NOTES: SkillNote[] = [
  {
    id: "h1",
    skillId: "voice-bank",
    tag: "Speech",
    title: "Voice Bank Builder",
    note: "It records in the gaps instead of asking me to sit down for an hour. 1,240 phrases in.",
    author: "sunay",
  },
  {
    id: "h2",
    skillId: "refill-runner",
    tag: "Care",
    title: "Refill Runner",
    note: "I have not sat in a pharmacy queue since January. It only pings me for decisions.",
    author: "sahas",
  },
  {
    id: "h3",
    skillId: "grocery-loop",
    tag: "Daily",
    title: "Grocery Loop",
    note: "Orders the shop on my rhythm and swaps in packaging I can still open one-handed.",
    author: "jordan",
  },
  {
    id: "h4",
    skillId: "care-roster",
    tag: "Care",
    title: "Care Shift Roster",
    note: "It asks the next person for me. My partner and I stopped negotiating at 3am.",
    author: "priya",
  },
];

export const HOME_FILTERS = ["All", "Speech", "Mobility", "Daily", "Care"] as const;

export function skillById(id: string): Skill | undefined {
  return SKILLS.find((s) => s.id === id);
}

export function featuredSkills(): Skill[] {
  return SKILLS.filter((s) => s.featured);
}
