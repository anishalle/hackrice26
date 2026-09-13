// Resources people living with ALS have written up and shared with each other.
// Icons are not stored here. They follow from the first tag, via `tagGlyph`.
export const CATEGORIES = ['Speech', 'Mobility', 'Daily', 'Care', 'Voice', 'Automation'];

export const SKILLS = [
  {
    id: 'voice-banking',
    title: 'Voice Banking Coach',
    author: '@sunay',
    tags: ['Voice', 'Speech'],
    karma: 214,
    featured: true,
    description: 'Walks you through recording your voice in short sittings, starting with the lines you actually say.',
  },
  {
    id: 'eye-gaze-setup',
    title: 'Eye-Gaze Setup',
    author: '@devonk',
    tags: ['Speech'],
    karma: 168,
    featured: true,
    description: 'Calibration settings and desk heights that cut fatigue during long conversations.',
  },
  {
    id: 'transfer-playbook',
    title: 'Transfer Playbook',
    author: '@sarahw',
    tags: ['Mobility'],
    karma: 141,
    featured: true,
    description: 'Bed, chair and bathroom transfers filmed from the angle a caregiver actually stands at.',
  },
  {
    id: 'grip-kitchen',
    title: 'Kitchen Without Grip',
    author: '@priya',
    tags: ['Daily'],
    karma: 122,
    description: 'Weighted utensils, plate guards and the rocker knife that kept eating independent longest.',
  },
  {
    id: 'breath-stacking',
    title: 'Breath Stacking',
    author: '@jules',
    tags: ['Daily', 'Care'],
    karma: 118,
    description: 'A daily routine your care team can check, with cues for when to escalate to a clinic.',
  },
  {
    id: 'night-shift-split',
    title: 'Night Shift Split',
    author: '@sarahw',
    tags: ['Care'],
    karma: 97,
    description: 'How two people split overnight turning and suctioning without either burning out.',
  },
  {
    id: 'switch-control',
    title: 'Switch Control Recipes',
    author: '@amina',
    tags: ['Automation', 'Mobility'],
    karma: 88,
    description: 'One-switch scanning setups for phone, lights and bed, tuned as movement narrows.',
  },
  {
    id: 'home-mods',
    title: 'Home Mods on a Budget',
    author: '@devonk',
    tags: ['Daily', 'Mobility'],
    karma: 76,
    description: 'Which changes to make first when the ramp quote comes back higher than the whole grant.',
  },
  {
    id: 'clinic-questions',
    title: 'Clinic Question Bank',
    author: '@sunay',
    tags: ['Care'],
    karma: 64,
    description: 'What to ask at each multidisciplinary visit, sorted by what changes between appointments.',
  },
  {
    id: 'text-to-speech-tuning',
    title: 'Speech Device Tuning',
    author: '@jules',
    tags: ['Speech', 'Voice'],
    karma: 52,
    description: 'Rate, phrasing and shortcut banks that make a synthesised voice sound like your timing.',
  },
  {
    id: 'travel-kit',
    title: 'Travel Kit',
    author: '@priya',
    tags: ['Mobility'],
    karma: 41,
    description: 'Airline wheelchair handling, battery paperwork and what to carry on rather than check.',
  },
  {
    id: 'fatigue-pacing',
    title: 'Fatigue Pacing',
    author: '@amina',
    tags: ['Daily', 'Automation'],
    karma: 33,
    description: 'Budgets the day into energy blocks and holds notifications until you have room for them.',
  },
];

// Long-form docs for the one skill that has them. Everything else falls back
// to its card description, which is what the detail page renders when a skill
// has no entry here.
export const SKILL_DOCS = {
  'voice-banking': {
    summary:
      'Voice banking records your natural speech while you still have it, so a speech device can use your own voice later instead of a synthetic one. The hard part is not the recording. It is knowing what to say, how much is enough, and when to start. This walks you through all three.',
    features: [
      {
        title: 'A script that sounds like you',
        body: 'Starts from the phrases you actually use day to day, pulled from your own messages, not a generic word list.',
      },
      {
        title: 'Short sittings, tracked',
        body: 'Twenty minute blocks with a running count of what is banked and what is left. Stop whenever your voice tires.',
      },
      {
        title: 'Quality checks as you go',
        body: 'Flags takes with room noise, clipping, or a tired voice before they end up in your final bank.',
      },
      {
        title: 'Hands off by design',
        body: 'Runs on voice commands and a single switch, so it keeps working as grip and reach change.',
      },
    ],
    why: [
      'Starting early matters more than recording a lot. Most people get a usable bank from a few hundred phrases caught before speech changes.',
      'A banked voice carries your rhythm and emphasis, which is what people who know you actually recognise.',
      'Everything stays on device until you choose a speech-device vendor, so you are not locked to one before you have picked.',
    ],
    forum: [
      {
        id: 'q1',
        asker: 'devonk',
        question: 'My speech has already slurred a bit. Is it too late to start?',
        answer:
          'No. Banking still works with mild slurring, and the checker will tell you which takes are clean enough to keep. Start with your most-used phrases first in case you get fewer sittings than you hoped.',
      },
      {
        id: 'q2',
        asker: 'priya',
        question: 'How many phrases before it is actually usable?',
        answer:
          'Around 400 gets you a bank that sounds like you in everyday conversation. 1500 or so is what vendors ask for a full synthetic voice. Both are useful, so do not wait until you can commit to the bigger number.',
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
