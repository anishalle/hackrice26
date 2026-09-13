// The weekly check-in as a reading. Five short lines, said out loud, each one
// kept as a take in the voice bank so the speech signals have something to
// measure and the banked voice has something to learn from.
//
// Written for the recogniser as much as the reader: no contractions ("it is"
// comes back as "it's" and never matches), no numbers, and nothing a
// dictation model reaches for a homophone on. Five lines is under a minute of
// speech, which leaves room for the pauses in the two minutes the card promises.
export const CHECK_IN_LINES = [
  'Good morning. My voice sounds like me today.',
  'The kettle is on, and the window is open.',
  'Please pass me the blue cup from the table.',
  'The doctor visit is on Tuesday afternoon.',
  'The rain has stopped, so we can go outside.',
];
