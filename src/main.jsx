import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ALPHABETS, createQuestion, getRanges, loadSettings, saveSettings } from "./game.js";
import { playCorrectSound, playWrongSound } from "./audio.js";
import { Communication } from "./Communication.jsx";
import "./styles.css";

const CONFETTI_COLORS = ["#ffd45a", "#7fc8f0", "#ff9d7a", "#5fa8a3", "#f36f9b"];

function createCelebrationPieces() {
  return Array.from({ length: 28 }, (_, index) => ({
    id: `${Date.now()}-${index}`,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: `${(index % 9) * 0.045}s`,
    left: `${8 + ((index * 17) % 84)}%`,
    rotate: `${(index % 2 === 0 ? 1 : -1) * (90 + index * 9)}deg`,
  }));
}

function Settings({ settings, ranges, changeRange, updateSetting }) {
  return (
    <details className="settings">
      <summary>せってい</summary>
      <div className="settings__controls">
        <label>
          文字の数
          <select aria-label="文字の数" value={settings.size} onChange={(event) => changeRange(event.target.value, 0)}>
            <option value="6">6もじ</option>
            <option value="12">12もじ</option>
            <option value="all">ぜんぶ</option>
          </select>
        </label>
        {settings.size !== "all" && (
          <label>
            文字の範囲
            <select aria-label="文字の範囲" value={settings.range} onChange={(event) => changeRange(settings.size, Number(event.target.value))}>
              {ranges.map((range, index) => (
                <option key={range[0]} value={index}>{range[0]} ～ {range[range.length - 1]}</option>
              ))}
            </select>
          </label>
        )}
        <label>
          あそびかた
          <select aria-label="あそびかた" value={settings.together ? "together" : "solo"}
            onChange={(event) => updateSetting("together", event.target.value === "together")}>
            <option value="solo">ひとりで</option>
            <option value="together">いっしょに</option>
          </select>
        </label>
        {[["effects", "効果音"], ["speech", "読み上げ"], ["motion", "アニメーション"]].map(([key, label]) => (
          <label key={key}>
            <input type="checkbox" checked={settings[key]}
              onChange={(event) => updateSetting(key, event.target.checked)} />
            {label}
          </label>
        ))}
      </div>
    </details>
  );
}

function App({ id }) {
  const { name, letters } = ALPHABETS[id];
  const [settings, setSettings] = useState(() => loadSettings(id));
  const ranges = getRanges(letters, settings.size);
  const [question, setQuestion] = useState(() => createQuestion(ranges[settings.range]));
  const [placedCount, setPlacedCount] = useState(0);
  const [adultTurn, setAdultTurn] = useState(false);
  const [wrong, setWrong] = useState(null);
  const [recentIndex, setRecentIndex] = useState(null);
  const [celebrationPieces, setCelebrationPieces] = useState([]);
  const isComplete = placedCount === question.answer.length;
  const placed = question.answer.slice(0, placedCount);

  useEffect(() => saveSettings(id, settings), [id, settings]);

  useEffect(() => {
    if (!wrong) return;
    const timeout = window.setTimeout(() => setWrong(null), 420);
    return () => window.clearTimeout(timeout);
  }, [wrong]);

  useEffect(() => {
    if (recentIndex === null) return;
    const timeout = window.setTimeout(() => setRecentIndex(null), 520);
    return () => window.clearTimeout(timeout);
  }, [recentIndex]);

  function chooseLetter(letter) {
    if (isComplete || placed.includes(letter)) return;

    if (letter !== question.answer[placedCount]) {
      setWrong({ letter });
      if (settings.effects) playWrongSound();
      return;
    }

    const isFinal = placedCount + 1 === question.answer.length;
    setPlacedCount(placedCount + 1);
    setWrong(null);
    if (settings.together) setAdultTurn(!adultTurn);
    if (settings.motion) {
      setRecentIndex(placedCount);
      if (isFinal) setCelebrationPieces(createCelebrationPieces());
    }
    if (settings.effects) playCorrectSound(isFinal);
  }

  function resetAnswer() {
    setPlacedCount(0);
    setAdultTurn(false);
    setWrong(null);
    setRecentIndex(null);
    setCelebrationPieces([]);
  }

  function startQuestion(lettersForQuestion) {
    setQuestion(createQuestion(lettersForQuestion));
    resetAnswer();
  }

  function changeRange(size, range) {
    if (size === settings.size && range === settings.range) return;
    if (placedCount > 0 && !isComplete &&
      !window.confirm("いまの答えを消して、文字の範囲を変えますか？")) return;

    setSettings({ ...settings, size, range });
    startQuestion(getRanges(letters, size)[range]);
  }

  function updateSetting(key, value) {
    setSettings({ ...settings, [key]: value });
    if (key === "together") setAdultTurn(false);
    if (key === "motion" && !value) {
      setRecentIndex(null);
      setCelebrationPieces([]);
    }
  }

  return (
    <main className="game" data-motion={settings.motion}>
      <section className="game__panel" aria-label={`${name}文字ならべゲーム`}>
        <div className="game__top">
          <h1>{name}文字ならべ</h1>
          <button className="icon-button" type="button" onClick={resetAnswer}
            aria-label="答えを消す" title="答えを消す"
            disabled={placedCount === 0 || isComplete}>
            ↺
          </button>
        </div>

        <Settings settings={settings} ranges={ranges} changeRange={changeRange} updateSetting={updateSetting} />

        {(settings.size !== "all" || settings.together) && <div className="round-info">
          {settings.size !== "all" && (
            <div className="range">
              <strong>{question.answer[0]} ～ {question.answer[question.answer.length - 1]}</strong>
              <button type="button" onClick={() => changeRange(settings.size, (settings.range + 1) % ranges.length)}>
                つぎの文字グループ
              </button>
            </div>
          )}
          {settings.together && (
            <div className="turn" role="status">{adultTurn ? "おとなのばん" : "こどものばん"}</div>
          )}
        </div>}

        <div className="message" aria-live="polite">
          {isComplete ? "できた！" : "じゅんばんに タップ"}
        </div>

        <div className="choices" aria-label="文字の選択肢">
          {question.choices.map((letter) => (
            <button className={wrong?.letter === letter ? "letter-button letter-button--wrong" : "letter-button"}
              key={letter} type="button" onClick={() => chooseLetter(letter)}
              disabled={placed.includes(letter) || isComplete} aria-label={`${letter}を選ぶ`}>
              {letter}
            </button>
          ))}
        </div>

        <div className="answer-row" role="list" aria-label="答え欄">
          {question.answer.map((_, index) => {
            const letter = placed[index];
            const isRecent = recentIndex === index;
            const classes = ["answer-slot", letter && "answer-slot--filled", isRecent && "answer-slot--new"];
            return (
              <div className={classes.filter(Boolean).join(" ")} key={index} role="listitem"
                aria-label={letter ? `${index + 1}番目は${letter}` : `${index + 1}番目の答え欄`}>
                {letter}
                {isRecent && <span className="mini-burst" aria-hidden="true"><span /><span /><span /><span /></span>}
              </div>
            );
          })}
        </div>

        {isComplete && (
          <>
            {celebrationPieces.length > 0 && (
              <div className="celebration-effect" aria-hidden="true">
                {celebrationPieces.map((piece) => (
                  <span className="confetti" key={piece.id} style={{
                    "--confetti-color": piece.color,
                    "--confetti-delay": piece.delay,
                    "--confetti-left": piece.left,
                    "--confetti-rotate": piece.rotate,
                  }} />
                ))}
              </div>
            )}
            <button className="next-button" type="button" onClick={() => startQuestion(question.answer)}>
              つぎのもんだい
            </button>
          </>
        )}

        <Communication speech={settings.speech} />
      </section>
    </main>
  );
}

const root = document.getElementById("root");
createRoot(root).render(<App id={root.dataset.alphabet} />);
