let audioContext;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playTone(audio, frequency, start, duration, type, volume) {
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime + start);
  gain.gain.setValueAtTime(0.0001, audio.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(volume, audio.currentTime + start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + start + duration);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start(audio.currentTime + start);
  oscillator.stop(audio.currentTime + start + duration + 0.03);
}

export function playCorrectSound(isFinal) {
  const audio = getAudioContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    void audio.resume().catch(() => {});
  }

  // A quick rising chime with a softer harmony on the last note.
  playTone(audio, 659, 0, 0.10, "triangle", 0.16);
  playTone(audio, 880, 0.045, 0.13, "triangle", 0.15);
  playTone(audio, 1319, 0.09, 0.20, "sine", 0.16);
  playTone(audio, 1047, 0.09, 0.18, "sine", 0.075);

  if (isFinal) {
    playCelebrationSound(audio, 0.25);
    [523, 659, 784, 1047, 1568].forEach((frequency, index) => {
      playTone(audio, frequency, 0.24 + index * 0.065, 0.26, "triangle", 0.13);
    });
  }
}

export function playWrongSound() {
  const audio = getAudioContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    void audio.resume().catch(() => {});
  }

  const oscillator = audio.createOscillator();
  const gain = audio.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(220, audio.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(120, audio.currentTime + 0.18);
  gain.gain.setValueAtTime(0.11, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.2);

  oscillator.connect(gain);
  gain.connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + 0.22);
}

function playCelebrationSound(audio, delay) {
  const start = audio.currentTime + delay;
  const bufferSize = Math.floor(audio.sampleRate * 0.55);
  const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    const burst = Math.sin(index / 90) > 0.2 ? 1 : 0.18;
    data[index] = (Math.random() * 2 - 1) * burst;
  }

  const noise = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();

  filter.type = "bandpass";
  filter.frequency.value = 1500;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.12, start + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.55);

  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  noise.start(start);
  noise.stop(start + 0.56);
}
