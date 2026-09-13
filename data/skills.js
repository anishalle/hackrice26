// The marketplace is agent skills, not articles. Every entry here is a
// workflow Axl can run on someone's behalf — the tasks that get harder as ALS
// progresses, written once by someone who worked out the steps and then shared
// so nobody else has to.
//
// Icons are not stored here. They follow from the first tag, via `tagGlyph`.
export const CATEGORIES = ['Speech', 'Voice', 'Mobility', 'Daily', 'Care', 'Automation'];

export const SKILLS = [
  {
    id: 'voice-bank',
    title: 'Voice Bank Builder',
    author: '@sunay',
    tags: ['Voice', 'Speech'],
    karma: 214,
    featured: true,
    description: 'Runs your recording sittings, checks each take, and builds a speech voice that still sounds like you.',
  },
  {
    id: 'refill-runner',
    title: 'Refill Runner',
    author: '@sahas',
    tags: ['Care', 'Automation'],
    karma: 186,
    featured: true,
    description: 'Tracks every prescription, sits in the pharmacy queue for you, and only asks when something needs a decision.',
  },
  {
    id: 'appeal-writer',
    title: 'Insurance Appeal Writer',
    author: '@priya',
    tags: ['Care', 'Automation'],
    karma: 171,
    featured: true,
    description: 'Drafts the appeal from your denial letter and your own notes, in your words, ready for you to send.',
  },
  {
    id: 'eye-gaze-tune',
    title: 'Eye-Gaze Tune-Up',
    author: '@jordan',
    tags: ['Mobility', 'Automation'],
    karma: 168,
    description: 'Recalibrates gaze targets as your control changes, and grows the hit areas before you start missing them.',
  },
  {
    id: 'ride-booker',
    title: 'Ride Booker',
    author: '@sahas',
    tags: ['Mobility', 'Daily'],
    karma: 141,
    description: 'Books accessible transport, confirms the lift actually works, and re-books itself when a driver cancels.',
  },
  {
    id: 'grocery-loop',
    title: 'Grocery Loop',
    author: '@priya',
    tags: ['Daily', 'Automation'],
    karma: 122,
    description: 'Reorders your usual shop on your own rhythm and swaps in packaging you can still open one-handed.',
  },
  {
    id: 'form-filler',
    title: 'Form Filler',
    author: '@jules',
    tags: ['Daily', 'Automation'],
    karma: 118,
    description: 'Fills disability, grant and clinic forms from what Axl already knows, then reads the answers back before sending.',
  },
  {
    id: 'care-roster',
    title: 'Care Shift Roster',
    author: '@sahas',
    tags: ['Care'],
    karma: 97,
    description: 'Builds the overnight turning and suctioning rota and asks the next person itself, so nobody has to chase.',
  },
  {
    id: 'inbox-triage',
    title: 'Inbox Triage',
    author: '@amina',
    tags: ['Automation', 'Daily'],
    karma: 88,
    description: 'Answers what it safely can in your voice, holds the rest, and reads you the short list once a day.',
  },
  {
    id: 'switch-recipes',
    title: 'Switch Control Recipes',
    author: '@jordan',
    tags: ['Automation', 'Mobility'],
    karma: 76,
    description: 'One-switch scanning setups for phone, lights and bed, retuned by Axl as movement narrows.',
  },
  {
    id: 'clinic-brief',
    title: 'Clinic Prep Brief',
    author: '@sunay',
    tags: ['Care', 'Speech'],
    karma: 64,
    description: 'Turns your check-ins into the two pages your clinic team reads before a visit, so nothing is recalled from memory.',
  },
  {
    id: 'read-aloud',
    title: 'Read-Aloud Replies',
    author: '@jules',
    tags: ['Speech', 'Voice'],
    karma: 52,
    description: 'Speaks your typed replies in your banked voice, with the phrases you use most kept one tap away.',
  },
  {
    id: 'fatigue-pacer',
    title: 'Fatigue Pacer',
    author: '@amina',
    tags: ['Daily', 'Automation'],
    karma: 41,
    description: 'Budgets the day into energy blocks and holds notifications until you have room for them.',
  },
];

// Long-form docs for the one skill that has them. Everything else falls back
// to its card description, which is what the detail page renders when a skill
// has no entry here.
export const SKILL_DOCS = {
  'voice-bank': {
    summary:
      'Voice banking records your natural speech while you still have it, so a speech device can use your own voice later instead of a synthetic one. The hard part is not the recording. It is knowing what to say, how much is enough, and when to start. Axl runs all three for you, and uses the audio already sitting in your weekly check-ins.',
    features: [
      {
        title: 'A script that sounds like you',
        body: 'Starts from the phrases you actually use day to day, pulled from your own messages and check-ins, not a generic word list.',
      },
      {
        title: 'Short sittings, tracked',
        body: 'Twenty minute blocks with a running count of what is banked and what is left. Stops you whenever your voice tires.',
      },
      {
        title: 'Quality checks as you go',
        body: 'Flags takes with room noise, clipping, or a tired voice before they end up in your final bank.',
      },
      {
        title: 'Hands off by design',
        body: 'Runs on voice commands, a single switch, or gaze, so it keeps working as grip and reach change.',
      },
    ],
    why: [
      'Starting early matters more than recording a lot. Most people get a usable bank from a few hundred phrases caught before speech changes.',
      'Every weekly check-in you have already done is usable audio, so the bank starts ahead of where you think it does.',
      'A banked voice carries your rhythm and emphasis, which is what people who know you actually recognise.',
      'Everything stays on your device until you choose a voice provider, so you are not locked to one before you have picked.',
    ],
    forum: [
      {
        id: 'q1',
        asker: 'jordan',
        question: 'My speech has already slurred a bit. Is it too late to start?',
        answer:
          'No. Banking still works with mild slurring, and the checker will tell you which takes are clean enough to keep. Start with your most-used phrases first in case you get fewer sittings than you hoped.',
      },
      {
        id: 'q2',
        asker: 'priya',
        question: 'How many phrases before it is actually usable?',
        answer:
          'Around 400 gets you a bank that sounds like you in everyday conversation. 1500 or so is what providers ask for a full synthetic voice. Both are useful, so do not wait until you can commit to the bigger number.',
      },
      {
        id: 'q3',
        asker: 'jules',
        question: 'Does the room matter much?',
        answer:
          'More than the microphone does. A carpeted room with the door shut beats an expensive mic in a kitchen. Keep the same room across sittings if you can.',
      },
    ],
  },
};
