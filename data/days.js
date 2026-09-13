// Every day with Axl is kept as a log: the thread, plus whatever in it a
// clinician would want to see. `flags` is the audited part — lines Axl pulled
// out because they read as a change rather than a question.
//
// `sent` is the last clinician this day went to, or null. The screen keeps its
// own overrides on top of this while the app is open.

export const CLINICIANS = [
  { id: 'reyes', name: 'Dr. Amara Reyes', role: 'Neurology · ALS clinic' },
  { id: 'okafor', name: 'Tomas Okafor', role: 'Speech-language pathology' },
  { id: 'lindqvist', name: 'Ines Lindqvist', role: 'Respiratory therapy' },
];

export const DAYS = [
  {
    id: 'd-0312',
    label: 'Today',
    date: 'Mar 12',
    title: 'Thin liquids and the new cup',
    summary: 'Two questions about swallowing, one about the angled cup Priya uses.',
    tags: ['Speech', 'Daily'],
    sent: null,
    flags: [
      { tone: 'gold', text: 'Coughing on water mentioned twice in one day' },
      { tone: 'blue', text: 'Asked about thickeners unprompted' },
    ],
    transcript: [
      {
        q: 'Water keeps catching in my throat by the evening. Is that the day wearing me out?',
        a: 'Often, yes — swallowing gets less reliable as the muscles tire, so evenings are usually worse than mornings. Thin liquids are the hardest, which is why water tends to be the first thing that catches. Worth telling your SLP that it is time-of-day rather than constant; that detail changes what they suggest.',
      },
      {
        q: 'Does thickening it actually help or does it just feel safer?',
        a: 'It helps for real. A thicker liquid moves slower, so the airway has time to close. Most people start with nectar consistency at the end of the day only, and keep water plain in the morning while it is still easy.',
      },
    ],
  },
  {
    id: 'd-0311',
    label: 'Yesterday',
    date: 'Mar 11',
    title: 'Voice banking, second sitting',
    summary: 'Recorded 140 phrases. Asked what order to do the rest in.',
    tags: ['Voice'],
    sent: { to: 'okafor', notes: 'Second sitting done. Voice steady for ~18 min then noticeably softer.' },
    flags: [{ tone: 'green', text: '140 phrases banked, 18 minutes before fatigue' }],
    transcript: [
      {
        q: 'Got through 140 today before my voice went soft. Which phrases next?',
        a: 'The ones you say to people rather than the ones you read. Names, "can you help me sit up", "I love you", the way you answer the phone. Vendors want volume eventually, but recognisability comes from the everyday lines, and those are the ones that stop being recordable first.',
      },
      {
        q: 'Should I push past the point where it gets soft?',
        a: 'No. A tired take is a take you will re-record, and pushing costs you tomorrow’s sitting. Eighteen minutes is a real number — log it and stop there each time.',
      },
    ],
  },
  {
    id: 'd-0309',
    label: 'Sat',
    date: 'Mar 9',
    title: 'Night turning, split shift',
    summary: 'Worked through Sarah’s two-person overnight split with Mom.',
    tags: ['Care'],
    sent: { to: 'reyes', notes: 'Caregiver sleep is the bottleneck, not the turning itself.' },
    flags: [{ tone: 'purple', text: 'Caregiver woke 4× overnight' }],
    transcript: [
      {
        q: 'Mom is up four times a night with me. How do other people split this?',
        a: 'The split that holds is by block, not by alarm: one person owns until 2am and sleeps after, the other takes 2am on and sleeps before. Four wakes split across two people is two each, but four wakes split across the same person is nobody sleeping. Sarah’s write-up in the marketplace has the exact handover she uses.',
      },
    ],
  },
  {
    id: 'd-0306',
    label: 'Wed',
    date: 'Mar 6',
    title: 'Breath stacking, day one',
    summary: 'Set up the routine and the cue for when to call the clinic.',
    tags: ['Daily', 'Care'],
    sent: null,
    flags: [
      { tone: 'gold', text: 'Morning headache reported — escalation cue met' },
      { tone: 'blue', text: 'Routine started, 3× daily' },
    ],
    transcript: [
      {
        q: 'I woke up with a headache again. Related?',
        a: 'It can be. Morning headaches are one of the first signs that breathing is shallower overnight, and they are on the short list of things to call the clinic about rather than wait out. Log it with the date — if it repeats this week that is the pattern they need to hear, not a one-off.',
      },
      {
        q: 'And the stacking routine — how often?',
        a: 'Three times a day, five stacks each, before meals works for most people because your chest is not full. Stop if you feel dizzy.',
      },
    ],
  },
  {
    id: 'd-0302',
    label: 'Sat',
    date: 'Mar 2',
    title: 'Kitchen without grip',
    summary: 'Rocker knife, plate guard, and which mug actually works.',
    tags: ['Daily'],
    sent: null,
    flags: [{ tone: 'green', text: 'Ate unassisted all three meals' }],
    transcript: [
      {
        q: 'Dropping mugs. Is there one that is actually designed for this?',
        a: 'Two handles and a lid, not a weighted one — weight helps tremor, not grip. Priya’s kitchen write-up lists the three she kept and the five she returned.',
      },
    ],
  },
  {
    id: 'd-0226',
    label: 'Feb 26',
    date: 'Feb 26',
    title: 'Eye-gaze desk height',
    summary: 'Recalibrated after moving the mount 4cm lower.',
    tags: ['Speech'],
    sent: { to: 'okafor', notes: 'Mount lowered 4cm, fatigue down noticeably.' },
    flags: [{ tone: 'green', text: 'Session length up from 12 to 25 minutes' }],
    transcript: [
      {
        q: 'My eyes ache after ten minutes on the gaze board. Is that just practice?',
        a: 'Usually it is geometry. Most mounts sit too high out of the box, so you are holding a slight upward gaze the whole time. Devon’s setup notes put the screen centre just below eye level and step the tracker back — people report roughly doubling their comfortable session length from that one change.',
      },
    ],
  },
];
