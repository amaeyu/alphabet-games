const { useEffect, useMemo, useState } = React;

const GREEK = [
  "Α",
  "Β",
  "Γ",
  "Δ",
  "Ε",
  "Ζ",
  "Η",
  "Θ",
  "Ι",
  "Κ",
  "Λ",
  "Μ",
  "Ν",
  "Ξ",
  "Ο",
  "Π",
  "Ρ",
  "Σ",
  "Τ",
  "Υ",
  "Φ",
  "Χ",
  "Ψ",
  "Ω",
];

const CONFETTI_COLORS = ["#ffd45a", "#7fc8f0", "#ff9d7a", "#5fa8a3", "#f36f9b"];

function shuffle(items) {
  const result = [...items];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[randomIndex]] = [result[randomIndex], result[index]];
  }

  return result;
}

function createQuestion() {
  const answer = GREEK;
  let choices = shuffle(answer);

  while (choices.join("") === answer.join("")) {
    choices = shuffle(answer);
  }

  return {
    answer,
    choices: choices.map((letter, index) => ({
      id: `${letter}-${index}-${Date.now()}`,
      letter,
    })),
  };
}

function createCelebrationPieces() {
  return Array.from({ length: 28 }, (_, index) => ({
    id: `${Date.now()}-${index}`,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: `${(index % 9) * 0.045}s`,
    left: `${8 + ((index * 17) % 84)}%`,
    rotate: `${(index % 2 === 0 ? 1 : -1) * (90 + index * 9)}deg`,
  }));
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!window.greekGameAudio) {
    window.greekGameAudio = new AudioContextClass();
  }

  return window.greekGameAudio;
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

function playCorrectSound(isFinal) {
  const audio = getAudioContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    audio.resume();
  }

  playTone(660, 0, 0.08, "sine", 0.12);
  playTone(880, 0.075, 0.11, "sine", 0.14);

  if (isFinal) {
    [523, 659, 784, 1046].forEach((frequency, index) => {
      playTone(frequency, 0.22 + index * 0.06, 0.22, "triangle", 0.12);
    });
  }
}

function playWrongSound() {
  const audio = getAudioContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    audio.resume();
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

function playCelebrationSound() {
  const audio = getAudioContext();
  if (!audio) return;

  if (audio.state === "suspended") {
    audio.resume();
  }

  const bufferSize = audio.sampleRate * 0.55;
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
  gain.gain.setValueAtTime(0.0001, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.55);

  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(audio.destination);
  noise.start();
  noise.stop(audio.currentTime + 0.56);
}

function App() {
  const [question, setQuestion] = useState(() => createQuestion());
  const [selected, setSelected] = useState(Array(question.answer.length).fill(null));
  const [wrongId, setWrongId] = useState(null);
  const [recentIndex, setRecentIndex] = useState(null);
  const [celebrationPieces, setCelebrationPieces] = useState([]);
  const chosenIds = useMemo(
    () => new Set(selected.filter(Boolean).map((item) => item.id)),
    [selected],
  );
  const placedCount = selected.filter(Boolean).length;
  const isComplete = placedCount === question.answer.length;
  const isCorrect =
    isComplete &&
    selected.map((item) => item?.letter).join("") === question.answer.join("");

  useEffect(() => {
    if (!wrongId) return undefined;

    const timeout = window.setTimeout(() => setWrongId(null), 420);
    return () => window.clearTimeout(timeout);
  }, [wrongId]);

  useEffect(() => {
    if (recentIndex === null) return undefined;

    const timeout = window.setTimeout(() => setRecentIndex(null), 520);
    return () => window.clearTimeout(timeout);
  }, [recentIndex]);

  function chooseLetter(item) {
    if (chosenIds.has(item.id) || isCorrect) return;

    const expectedLetter = question.answer[placedCount];

    if (item.letter !== expectedLetter) {
      setWrongId(item.id);
      playWrongSound();
      return;
    }

    const isFinal = placedCount + 1 === question.answer.length;

    setSelected((current) => {
      const next = [...current];
      next[placedCount] = item;
      return next;
    });
    setRecentIndex(placedCount);
    playCorrectSound(isFinal);

    if (isFinal) {
      setCelebrationPieces(createCelebrationPieces());
      window.setTimeout(playCelebrationSound, 220);
    }
  }

  function resetAnswer() {
    if (isCorrect) return;
    setSelected(Array(question.answer.length).fill(null));
    setWrongId(null);
    setRecentIndex(null);
    setCelebrationPieces([]);
  }

  function nextQuestion() {
    const next = createQuestion();
    setQuestion(next);
    setSelected(Array(next.answer.length).fill(null));
    setWrongId(null);
    setRecentIndex(null);
    setCelebrationPieces([]);
  }

  return (
    <main className="game">
      <section className="game__panel" aria-label="ギリシア文字ならべゲーム">
        <div className="game__top">
          <h1>ギリシア文字ならべ</h1>
          <button
            className="icon-button"
            type="button"
            onClick={resetAnswer}
            aria-label="答えを消す"
            title="答えを消す"
            disabled={placedCount === 0 || isCorrect}
          >
            ↺
          </button>
        </div>

        <div className="message" aria-live="polite">
          {isCorrect ? "できた！" : "じゅんばんに タップ"}
        </div>

        <div className="choices" aria-label="文字の選択肢">
          {question.choices.map((item) => (
            <button
              className={["letter-button", wrongId === item.id ? "letter-button--wrong" : ""]
                .filter(Boolean)
                .join(" ")}
              key={item.id}
              type="button"
              onClick={() => chooseLetter(item)}
              disabled={chosenIds.has(item.id) || isCorrect}
              aria-label={`${item.letter}を選ぶ`}
            >
              {item.letter}
            </button>
          ))}
        </div>

        <div className="answer-row" role="list" aria-label="答え欄">
          {question.answer.map((_, index) => {
            const item = selected[index];

            return (
              <div
                className={[
                  "answer-slot",
                  item ? "answer-slot--filled" : "",
                  recentIndex === index ? "answer-slot--new" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={index}
                role="listitem"
                aria-label={item ? `${index + 1}番目は${item.letter}` : `${index + 1}番目の答え欄`}
              >
                {item?.letter}
                {recentIndex === index && (
                  <span className="mini-burst" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {isCorrect && (
          <>
            <div className="celebration-effect" aria-hidden="true">
              {celebrationPieces.map((piece) => (
                <span
                  className="confetti"
                  key={piece.id}
                  style={{
                    "--confetti-color": piece.color,
                    "--confetti-delay": piece.delay,
                    "--confetti-left": piece.left,
                    "--confetti-rotate": piece.rotate,
                  }}
                />
              ))}
            </div>
            <button className="next-button" type="button" onClick={nextQuestion}>
              つぎのもんだい
            </button>
          </>
        )}
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
