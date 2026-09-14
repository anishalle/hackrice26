// Weekly check-ins. Axl asks how the week went, records the answer, and reads
// the recording for signal rather than content: speaking rate, pause length,
// filler count, how confident recognition was, how long replies took to start,
// and how accurately targets were being hit. Those are the `flags` on a
// check-in, and they are what a clinician can follow between assessments
// instead of re-running the whole test.
//
// `sent` is the last clinician this check-in went to, or null. The screen keeps
// its own overrides on top of this while the app is open.

export const CLINICIANS = [
  { id: 'reyes', name: 'Dr. Amara Reyes', role: 'Neurology · ALS clinic' },
  { id: 'okafor', name: 'Tomas Okafor', role: 'Speech-language pathology' },
  { id: 'lindqvist', name: 'Ines Lindqvist', role: 'Respiratory therapy' },
];

export const DAYS = [
  {
    id: 'w-0312',
    label: 'This week',
    date: 'Mar 12',
    title: 'Week 14 check-in',
    summary: 'Three minutes spoken. Speaking rate down slightly, pauses longer by the end of the week.',
    tags: ['Speech', 'Daily'],
    sent: null,
    flags: [
      { tone: 'amber', text: 'Speaking rate 132 wpm, down 6 from last week' },
      { tone: 'amber', text: 'Mean pause 0.9s, longest runs in the evening' },
      { tone: 'periwinkle', text: 'Recognition confidence 94%, unchanged' },
      { tone: 'mint', text: 'Tap accuracy steady, no target growth needed' },
    ],
    transcript: [
      {
        q: 'Mornings were fine. By about six I was losing words, and water kept catching in my throat.',
        a: 'That matches the recording. Your rate holds through the first half of the week and drops in the evening clips, with pauses lengthening alongside it. Both point at fatigue rather than a step change. I logged the swallowing separately, because that one is worth your SLP hearing on its own.',
      },
      {
        q: 'Anything I should do differently?',
        a: 'Move whatever needs your voice earlier in the day and let me take the calls that land after five. I also queued two banking sittings from this week’s audio, so the bank grows without you sitting down to record.',
      },
    ],
  },
  {
    id: 'w-0305',
    label: 'Last week',
    date: 'Mar 5',
    title: 'Week 13 check-in',
    summary: 'Voice steady for eighteen minutes, then noticeably softer. 140 phrases banked from the week.',
    tags: ['Voice'],
    sent: { to: 'okafor', notes: 'Voice holds ~18 min then drops off. Banking is ahead of schedule.' },
    flags: [
      { tone: 'mint', text: '140 phrases banked, no sitting run past fatigue' },
      { tone: 'periwinkle', text: 'Speaking rate 138 wpm, flat for three weeks' },
      { tone: 'amber', text: 'Filler rate up: 14 per hundred words' },
    ],
    transcript: [
      {
        q: 'Got through a lot of recording this week. Felt good until it suddenly did not.',
        a: 'Eighteen minutes is where your volume starts falling off, the same point as the last two weeks, so it is a reliable number rather than a bad day. I capped the sittings there instead of at twenty.',
      },
      {
        q: 'Which phrases should it take next?',
        a: 'The ones you say to people rather than the ones you read. Names, "can you help me sit up", the way you answer the phone. Those stop being recordable first, so they go to the front of the queue.',
      },
    ],
  },
  {
    id: 'w-0226',
    label: 'Feb 26',
    date: 'Feb 26',
    title: 'Week 12 check-in',
    summary: 'First week the app grew its own buttons. Overnight turning came up again.',
    tags: ['Mobility', 'Care'],
    sent: { to: 'reyes', notes: 'Targets grown one step. Caregiver sleep is the bottleneck, not the turning.' },
    flags: [
      { tone: 'peach', text: 'Tap accuracy 88%, targets grown one step' },
      { tone: 'peach', text: 'Caregiver woke 4× overnight' },
      { tone: 'periwinkle', text: 'Reply latency 2.4s, up from 1.9s' },
    ],
    transcript: [
      {
        q: 'I keep missing the small buttons, and Mom is up four times a night with me.',
        a: 'I saw the misses before you mentioned them. Accuracy dropped to 88% on the smallest targets, so everything stepped up a size and the spacing came with it. For the nights, Care Shift Roster splits the wake-ups by block rather than by alarm, and it asks the second person itself so you are not the one chasing.',
      },
    ],
  },
  {
    id: 'w-0219',
    label: 'Feb 19',
    date: 'Feb 19',
    title: 'Week 11 check-in',
    summary: 'Morning headaches twice. Breathing routine started and logged.',
    tags: ['Daily', 'Care'],
    sent: null,
    flags: [
      { tone: 'amber', text: 'Morning headache twice, escalation cue met' },
      { tone: 'mint', text: 'Breathing routine logged 3× daily' },
      { tone: 'periwinkle', text: 'Speaking rate 139 wpm, unchanged' },
    ],
    transcript: [
      {
        q: 'Woke up with a headache twice this week. Related?',
        a: 'It can be. Morning headaches are one of the first signs breathing is shallower overnight, and they are on the short list of things to call the clinic about rather than wait out. Twice in one week is the pattern they need to hear, so this check-in is flagged and ready to send.',
      },
      {
        q: 'Send it then.',
        a: 'Sent to Dr. Reyes with the last three weeks attached, so the headaches arrive next to your rate and pause trend rather than on their own.',
      },
    ],
  },
  {
    id: 'w-0212',
    label: 'Feb 12',
    date: 'Feb 12',
    title: 'Week 10 check-in',
    summary: 'Ate unassisted all week. Grocery ordering moved onto the agent.',
    tags: ['Daily'],
    sent: null,
    flags: [
      { tone: 'mint', text: 'Ate unassisted all seven days' },
      { tone: 'mint', text: 'Grocery Loop ran twice, no intervention needed' },
    ],
    transcript: [
      {
        q: 'Dropping mugs, but eating is still mine. Ordering is the annoying part.',
        a: 'Grocery Loop has your usual shop now, and it swaps in the two-handled lidded mugs rather than the ones you have been dropping. It reorders on your rhythm and only tells you when something is out of stock.',
      },
    ],
  },
  {
    id: 'w-0205',
    label: 'Feb 5',
    date: 'Feb 5',
    title: 'Week 9 check-in',
    summary: 'Gaze setup recalibrated. Comfortable session length up from 12 to 25 minutes.',
    tags: ['Mobility', 'Speech'],
    sent: { to: 'okafor', notes: 'Gaze mount lowered 4cm, comfortable session length roughly doubled.' },
    flags: [
      { tone: 'mint', text: 'Gaze session length 12 → 25 minutes' },
      { tone: 'periwinkle', text: 'Dwell time 480ms, targets held at current size' },
    ],
    transcript: [
      {
        q: 'My eyes ache after ten minutes on the gaze board. Is that just practice?',
        a: 'Usually it is geometry. Most mounts sit too high out of the box, so you hold a slight upward gaze the whole time. Eye-Gaze Tune-Up dropped the screen centre just below eye level and stepped the tracker back, and your comfortable session roughly doubled that same week.',
      },
    ],
  },
];
