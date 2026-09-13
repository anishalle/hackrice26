import { File, Paths } from 'expo-file-system';

// Plays generated speech on the phone. The backend hands back MP3 bytes from a
// POST, which the audio player cannot fetch itself, so the bytes go through a
// cache file. Resolved lazily like the recogniser: expo-audio is native, and a
// build made before it was added should lose speech, not the whole app.

let module;
const audio = () => {
  if (module === undefined) {
    try {
      module = require('expo-audio');
    } catch {
      module = null;
    }
  }
  return module;
};

let modeSet = false;

export async function playMp3(buffer) {
  const Audio = audio();
  if (!Audio) throw new Error('This build cannot play your voice. Rebuild the app with npx expo run:ios.');
  if (!modeSet) {
    modeSet = true;
    // Someone who cannot speak has the phone on silent more often than not.
    await Audio.setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'duckOthers' }).catch(() => {});
  }

  const file = new File(Paths.cache, `voice-${Date.now()}.mp3`);
  file.write(new Uint8Array(buffer));

  const player = Audio.createAudioPlayer({ uri: file.uri });
  try {
    await new Promise((resolve, reject) => {
      const sub = player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) { sub.remove(); resolve(); }
        else if (status.error) { sub.remove(); reject(new Error('Playback failed.')); }
      });
      player.play();
    });
  } finally {
    player.remove();
    try { file.delete(); } catch {}
  }
}
