let audioContext;

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  audioContext ??= new AudioContextClass();
  return audioContext;
}

function playTone(frequency, start, duration, type, volume) {
  const audio = getAudioContext();
  if (!audio) return;

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

  playTone(660, 0, 0.08, "sine", 0.12);
  playTone(880, 0.075, 0.11, "sine", 0.14);

  if (isFinal) {
    playCelebrationSound(audio, 0.22);
    [523, 659, 784, 1046].forEach((frequency, index) => {
      playTone(frequency, 0.22 + index * 0.06, 0.22, "triangle", 0.12);
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
