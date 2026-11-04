import React, { useEffect, useState } from "react";

const PHRASES = ["みて！", "もういっかい", "てつだって"];

export function Communication({ speech }) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!speech) window.speechSynthesis?.cancel();
  }, [speech]);

  function communicate(phrase) {
    setMessage({ phrase });
    if (!speech) return;

    try {
      const synth = window.speechSynthesis;
      const voice = synth?.getVoices().find(
        (item) => item.localService && /^ja(?:[-_]|$)/i.test(item.lang),
      );
      if (!voice) return;

      const utterance = new SpeechSynthesisUtterance(phrase);
      utterance.lang = "ja-JP";
      utterance.voice = voice;
      synth.cancel();
      synth.speak(utterance);
    } catch {
      // The visual message also works on devices without speech support.
    }
  }

  return (
    <section className="communication" aria-label="つたえる">
      <div className="communication__message" role="status" aria-atomic="true">
        {message.phrase}
      </div>
      <div className="communication__buttons">
        {PHRASES.map((phrase) => (
          <button key={phrase} type="button" onClick={() => communicate(phrase)}>
            {phrase}
          </button>
        ))}
      </div>
    </section>
  );
}
