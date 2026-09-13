// What Axl offers instead of a text field.
//
// In gaze mode every question ships with its answers, because recognising a
// choice is cheap and composing a sentence is not: a typed reply is dozens of
// dwells, and fatigue is the real budget. Axl writes, the person picks.

// The weekly check-in as a script. Six selections end to end, and the last two
// are the clinician send, which is the only irreversible step in it.
export const CHECK_IN = [
  {
    id: 'start',
    ask: 'Ready for this week’s check-in? It takes about two minutes.',
    options: [
      { id: 'yes', label: 'Yes, start', say: 'Yes, start.' },
      { id: 'later', label: 'Not now', say: 'Not now.' },
    ],
  },
  {
    id: 'week',
    ask: 'How has the week been?',
    options: [
      { id: 'better', label: 'Better', say: 'Better than last week.' },
      { id: 'same', label: 'About the same', say: 'About the same.' },
      { id: 'harder', label: 'Harder', say: 'Harder than last week.' },
      { id: 'more', label: 'Let me say more', say: null },
    ],
  },
  {
    id: 'swallow',
    ask: 'Anything catching when you drink?',
    options: [
      { id: 'yes', label: 'Yes', say: 'Yes, water has been catching.' },
      { id: 'no', label: 'No', say: 'No, drinking is fine.' },
    ],
  },
  {
    id: 'when',
    ask: 'Evenings only, or all day?',
    options: [
      { id: 'evening', label: 'Evenings', say: 'Evenings, once I am tired.' },
      { id: 'allday', label: 'All day', say: 'All day.' },
    ],
  },
  {
    id: 'send',
    ask: 'Your rate is down 6 and pauses are longer. Send this week to Dr. Reyes?',
    options: [
      { id: 'yes', label: 'Send it', say: 'Send it to Dr. Reyes.', confirm: true },
      { id: 'no', label: 'Keep it here', say: 'Keep it here for now.' },
    ],
  },
];

// What Axl says back to each answer. Kept beside the script rather than in the
// screen, because the register is the point: short sentences, one idea each,
// no subordinate clauses to hold in working memory.
export const REPLIES = {
  start: 'Good. Four questions, then we are done.',
  later: 'Fine. I will ask again tomorrow, and nothing is lost.',
  better: 'Noted. Your numbers agree: rate held for most of the week.',
  same: 'Noted. Your rate is down 6 from last week, so it is drifting even where it feels level.',
  harder: 'Noted, and your recording agrees. Rate down 6, pauses longer by the end of the week.',
  more: 'Go ahead. Pick a phrase or use the keyboard, and I will listen.',
  'swallow-yes': 'Logged separately, because your SLP wants that one on its own.',
  'swallow-no': 'Good. I will keep watching it.',
  evening: 'That points at fatigue rather than a step change. I will move what needs your voice earlier in the day.',
  allday: 'That is worth a call rather than a wait. I will flag it at the top of the week.',
  'send-yes': 'Sent, with the last three weeks attached so it arrives next to the trend.',
  'send-no': 'Kept here. It stays ready if you change your mind.',
};

// The phrase board: the escape hatch that is not a keyboard. Two dwells, and
// what comes out is spoken in the banked voice rather than read off a screen.
//
// `when` is which parts of the day a phrase leads with. A board is only four
// targets wide, so the ordering decides whether the right sentence is on the
// first page or behind a Show more: at 2am that is "I need to be moved", and
// in the morning it is not. Phrases with no `when` are always eligible.
export const PARTS = ['morning', 'afternoon', 'evening', 'night'];

export const partOfDay = (hour = new Date().getHours()) => {
  if (hour < 6) return 'night';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'night';
};

// Ranked for the current part of the day: matches first, order otherwise kept,
// so a page never reshuffles under someone mid-dwell.
export const rankPhrases = (phrases, part = partOfDay()) => {
  const hit = (p) => (p.when ? p.when.includes(part) : false);
  return [...phrases].sort((a, b) => Number(hit(b)) - Number(hit(a)));
};

export const PHRASE_BOARD = [
  {
    id: 'body',
    label: 'How I feel',
    phrases: [
      { text: 'I am tired.', when: ['evening', 'night'] },
      { text: 'I am in pain.' },
      { text: 'I need to be moved.', when: ['night'] },
      { text: 'My breathing feels shallow.', when: ['night', 'morning'] },
      { text: 'I am too warm.', when: ['afternoon', 'night'] },
      { text: 'My throat is catching.', when: ['evening'] },
    ],
  },
  {
    id: 'need',
    label: 'What I need',
    phrases: [
      { text: 'Please help me sit up.', when: ['morning', 'night'] },
      { text: 'Please suction.', when: ['night'] },
      { text: 'I would like a drink.', when: ['afternoon', 'evening'] },
      { text: 'Please come here.' },
      { text: 'Later, not now.' },
      { text: 'Please wait a moment.' },
    ],
  },
  {
    id: 'people',
    label: 'People',
    phrases: [
      { text: 'I love you.' },
      { text: 'Thank you.' },
      { text: 'Stay a while.', when: ['evening', 'night'] },
      { text: 'Tell me about your day.', when: ['evening'] },
      { text: 'I am glad you came.', when: ['afternoon'] },
      { text: 'I missed you.' },
    ],
  },
  {
    id: 'agent',
    label: 'For Axl',
    phrases: [
      { text: 'Read me my messages.', when: ['morning'] },
      { text: 'Refill my prescriptions.', when: ['morning', 'afternoon'] },
      { text: 'Book a ride for tomorrow.', when: ['evening'] },
      { text: 'Order the usual shop.', when: ['afternoon'] },
      { text: 'Run my banking sitting.', when: ['morning'] },
      { text: 'Ask the clinic about this.' },
    ],
  },
];
