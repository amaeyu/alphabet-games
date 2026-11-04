import React, { useEffect, useState } from "react";
import { speakJapanese } from "./speech.js";

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
    if (speech) speakJapanese(phrase);
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
