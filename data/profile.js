// The person, and the settings that decide how the app meets them. Everything
// under `access` is what the adaptive UI reads: Axl proposes a change when the
// tracking says one is due, and this is where it lands once accepted.
// Every demo login uses this same profile, regardless of the entered credentials.

export const PROFILE = {
  name: 'Jordan Fields',
  handle: '@jordan',
  since: 'Week 14 with Axl',
  diagnosis: 'Limb-onset ALS · diagnosed Nov 2024',
  // Persona check is how the app knows a real person is on this side of the
  // conversation before anything health-related moves.
  verified: { status: 'Verified in person', when: 'Feb 3', method: 'Voice + clinic code' },
  care: [
    { id: 'reyes', name: 'Dr. Amara Reyes', role: 'Neurology · ALS clinic', sharing: 'Weekly signals' },
    { id: 'okafor', name: 'Tomas Okafor', role: 'Speech-language pathology', sharing: 'Speech signals only' },
    { id: 'mom', name: 'Elena Fields', role: 'Care partner', sharing: 'Shift roster' },
  ],
};

// Interaction method, target size and text size. `TARGET_STEPS` is the ladder
// the adaptive UI climbs — one step per accepted proposal, never silently.
export const INPUTS = [
  { id: 'touch', label: 'Touch', hint: 'Tap and swipe' },
  { id: 'voice', label: 'Voice', hint: 'Speak to Axl' },
  { id: 'switch', label: 'Switch', hint: 'One-button scanning' },
  { id: 'gaze', label: 'Eye gaze', hint: 'Dwell to select' },
];

export const TARGET_STEPS = ['Standard', 'Large', 'Largest'];
export const TEXT_STEPS = ['Standard', 'Large', 'Largest'];

export const ACCESS = {
  inputs: ['touch', 'voice'],
  target: 'Large',
  text: 'Standard',
  // Axl grows the targets itself when accuracy drops, rather than waiting to be
  // asked. Off means it proposes and waits.
  adaptive: true,
  dwellMs: 480,
  reduceMotion: false,
  speakReplies: true,
};

// What the tracking has actually seen, newest first. The profile shows these so
// an adaptive change is never a surprise — the number that caused it is right
// there next to it.
export const TRENDS = [
  { id: 'rate', label: 'Speaking rate', value: '132 wpm', delta: '−6 this week', tone: 'amber' },
  { id: 'pause', label: 'Mean pause', value: '0.9s', delta: '+0.1 this week', tone: 'amber' },
  { id: 'confidence', label: 'Recognition confidence', value: '94%', delta: 'flat', tone: 'periwinkle' },
  { id: 'accuracy', label: 'Tap accuracy', value: '91%', delta: '+3 since targets grew', tone: 'mint' },
  { id: 'bank', label: 'Voice bank', value: '1,240 phrases', delta: '+140 this week', tone: 'mint' },
];
