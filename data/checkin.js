// The weekly check-in as a reading. Five short lines, said out loud, each one
// kept as a take in the voice bank so the speech signals have something to
// measure and the banked voice has something to learn from.
//
// Written for the recogniser as much as the reader: no contractions ("it is"
// comes back as "it's" and never matches), no numbers, and nothing a
// dictation model reaches for a homophone on. Five lines is under a minute of
// speech, which leaves room for the pauses in the two minutes the card promises.
export const CHECK_IN_LINES = [
  'Good morning. My voice sounds like me today. I\'m feeling great and ready to tackle the day.',
  'The kettle is on, and the window is open. I really wish that I had more tokens',
];
