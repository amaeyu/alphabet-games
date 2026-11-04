export function speakJapanese(phrase, { pitch = 1, rate = 1, interrupt = true } = {}) {
  try {
    const synth = window.speechSynthesis;
    if (!synth || (!interrupt && (synth.speaking || synth.pending))) return;
    const voice = synth.getVoices().find(
      (item) => item.localService && /^ja(?:[-_]|$)/i.test(item.lang),
    );
    if (!voice) return;

    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.lang = "ja-JP";
    utterance.voice = voice;
    utterance.pitch = pitch;
    utterance.rate = rate;
    if (interrupt) synth.cancel();
    synth.speak(utterance);
  } catch {
    // The visual feedback and effects remain available without speech support.
  }
}
