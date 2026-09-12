import type { Axis, Profile } from "./capability";

/**
 * Fixture content. Synthetic, and labelled as such wherever it is shown.
 * Written to read like the real thing a community of disabled users would
 * actually post: specific problems, specific workarounds, named tradeoffs.
 */

export interface Author {
  id: string;
  name: string;
  /** Profile fingerprint axes this person has attested. */
  attested: Axis[];
  /** Their own profile, used to show "people plotted like you". */
  profile: Partial<Profile>;
}

export const AUTHORS: Record<string, Author> = {
  rune: {
    id: "rune",
    name: "Rune O.",
    attested: ["vision"],
    profile: { vision: 0 },
  },
  dea: {
    id: "dea",
    name: "Dea M.",
    attested: ["motor", "speech"],
    profile: { motor: 0, speech: 1 },
  },
  kwesi: {
    id: "kwesi",
    name: "Kwesi A.",
    attested: ["hearing"],
    profile: { hearing: 0 },
  },
  ilse: {
    id: "ilse",
    name: "Ilse V.",
    attested: ["motor"],
    profile: { motor: 1 },
  },
  tam: {
    id: "tam",
    name: "Tam R.",
    attested: ["cognitive"],
    profile: { cognitive: 1, vision: 2 },
  },
};

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  ago: string;
}

export interface Post {
  id: string;
  authorId: string;
  ago: string;
  /** The problem, stated plainly. Doubles as the post's title. */
  problem: string;
  /** What they actually did about it. */
  solution: string;
  /** Which axes this is relevant to — drives "plotted like you" sorting. */
  axes: Axis[];
  /** How many people marked this as having worked for them too. */
  worked: number;
  comments: Comment[];
}

export const POSTS: Post[] = [
  {
    id: "p1",
    authorId: "dea",
    ago: "2h",
    problem: "Every bank app I've tried makes you turn your head for the liveness check.",
    solution:
      "Two of them will accept a video call with a human agent instead if you ask support directly — it isn't in the app anywhere. Ask for 'assisted identity verification' by name, not 'accessibility help', or you get routed to a page about font sizes.",
    axes: ["motor"],
    worked: 47,
    comments: [
      {
        id: "c1",
        authorId: "ilse",
        body: "The phrase matters. 'Accessibility' got me a PDF. 'Assisted identity verification' got me a person in four minutes.",
        ago: "1h",
      },
      {
        id: "c2",
        authorId: "rune",
        body: "Same with the one I use, except they call it 'manual review'. Worth trying all three phrases.",
        ago: "44m",
      },
    ],
  },
  {
    id: "p2",
    authorId: "rune",
    ago: "6h",
    problem: "Screen readers read the pharmacy refill form's error messages before the field they belong to.",
    solution:
      "I stopped fighting it and now fill the form in reverse — last field first. Sounds silly, works every time, because their validation only fires forward. Told their dev team; no reply in five months.",
    axes: ["vision"],
    worked: 23,
    comments: [
      {
        id: "c3",
        authorId: "tam",
        body: "Reverse-filling also helps me. Fewer things change on screen while I'm still reading.",
        ago: "3h",
      },
    ],
  },
  {
    id: "p3",
    authorId: "kwesi",
    ago: "1d",
    problem: "Automated phone menus with no text alternative, for things that have no web equivalent.",
    solution:
      "I have the agent sit through the menu and type me a transcript, then I tell it which option to pick. Cut a 20-minute call down to about two minutes of my attention. It's the only reason I renewed my parking permit on time.",
    axes: ["hearing"],
    worked: 61,
    comments: [
      {
        id: "c4",
        authorId: "dea",
        body: "This is the single most useful thing I've read here. Doing it for the utility company tomorrow.",
        ago: "20h",
      },
      {
        id: "c5",
        authorId: "ilse",
        body: "Works for appointment lines too. Ask it to hold and ping you when a human picks up.",
        ago: "12h",
      },
    ],
  },
  {
    id: "p4",
    authorId: "tam",
    ago: "2d",
    problem: "Government benefit portals time out while I'm still reading the question.",
    solution:
      "Most of them extend the timeout if you have an accommodation on file, but nobody tells you and the setting is never in your account page. It's a phone request. Ask for 'extended session timeout as a reasonable accommodation' and get the reference number in writing.",
    axes: ["cognitive", "vision"],
    worked: 38,
    comments: [],
  },
  {
    id: "p5",
    authorId: "ilse",
    ago: "3d",
    problem: "Grocery delivery apps put the substitution approval behind a 90-second countdown.",
    solution:
      "Set substitutions to 'refund, never replace' in advance and the countdown never appears. You lose the item but you don't lose the whole order to a timer you can't beat.",
    axes: ["motor", "cognitive"],
    worked: 52,
    comments: [
      {
        id: "c6",
        authorId: "tam",
        body: "Did this last month. The relief of not having a clock on me is worth the occasional missing item.",
        ago: "2d",
      },
    ],
  },
];

/* -------------------------------------------------------------------------- */

export interface AgentTask {
  id: string;
  title: string;
  /** What the agent actually does, stated as an action the user is delegating. */
  detail: string;
  /** Why this person in particular is delegating it — ties to an axis. */
  axes: Axis[];
  duration: string;
}

export const AGENT_TASKS: AgentTask[] = [
  {
    id: "t1",
    title: "Sit through a phone menu",
    detail: "Call a number, navigate the menu, transcribe it, and hold for a human.",
    axes: ["hearing", "speech", "motor"],
    duration: "~12 min",
  },
  {
    id: "t2",
    title: "Fill out a form",
    detail: "Work through a long web form using what's already on your profile, and read back anything it can't answer.",
    axes: ["vision", "motor", "cognitive"],
    duration: "~4 min",
  },
  {
    id: "t3",
    title: "Read and summarise a thread",
    detail: "Take a long comment thread and give you the three things that are actually new.",
    axes: ["vision", "cognitive"],
    duration: "~30 s",
  },
  {
    id: "t4",
    title: "Draft and post a reply",
    detail: "Write a reply in your voice, read it back, and post it once you say go.",
    axes: ["vision", "motor", "speech"],
    duration: "~1 min",
  },
  {
    id: "t5",
    title: "Chase an accommodation request",
    detail: "Follow up on a pending request, keep a written record, and escalate on a schedule.",
    axes: ["cognitive", "speech"],
    duration: "ongoing",
  },
];

/** The scripted exchange used when voice input isn't available in the browser. */
export const SAMPLE_EXCHANGE = [
  {
    role: "user" as const,
    text: "Read me the top post and tell me if it applies to my bank.",
  },
  {
    role: "agent" as const,
    text:
      "Top post is from Dea M., two hours ago. The problem: every bank app she's tried makes you turn your head for the liveness check. Her workaround is to ask support for 'assisted identity verification' by that exact name. Your bank is on the list of two that offer it. Want me to place the call and hold for an agent?",
  },
];
