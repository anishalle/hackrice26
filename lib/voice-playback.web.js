// The browser plays the MP3 straight from a blob URL. Same surface as native.

export function playMp3(buffer) {
  const url = URL.createObjectURL(new Blob([buffer], { type: 'audio/mpeg' }));
  const audio = new Audio(url);
  return new Promise((resolve, reject) => {
    audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
    audio.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Playback failed.')); };
    audio.play().catch((error) => { URL.revokeObjectURL(url); reject(error); });
  });
}
