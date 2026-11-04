import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { ALPHABETS, createQuestion, getRanges, loadSettings, saveSettings } from "./game.js";
import { playCorrectSound, playWrongSound } from "./audio.js";
import { Communication } from "./Communication.jsx";
import "./styles.css";

const CONFETTI_COLORS = ["#ffd45a", "#7fc8f0", "#ff9d7a", "#5fa8a3", "#f36f9b"];

const PRAISE = [
  "GREAT!",
  "PERFECT!",
  "YOU DID IT!",
  "AMAZING!",
  "WELL DONE!",
  "YOU’RE A STAR!",
  "THAT WAS AWESOME!",
  "FANTASTIC!",
  "WHAT A GREAT JOB!",
  "BRILLIANT!",
];

function createCelebrationPieces() {
  return Array.from({ length: 64 }, (_, index) => ({
    id: `${Date.now()}-${index}`,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    delay: `${(index % 13) * 0.055}s`,
    left: `${8 + ((index * 17) % 84)}%`,
    rotate: `${(index % 2 === 0 ? 1 : -1) * (90 + index * 9)}deg`,
  }));
}

function Settings({ settings, ranges, changeRange, updateSetting }) {
  return (
    <details className="settings">
      <summary>せってい</summary>
      <div className="settings__controls">
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
  const [praiseIndex, setPraiseIndex] = useState(-1);
  const isComplete = placedCount === question.answer.length;
  const placed = question.answer.slice(0, placedCount);
  const showPraise = isComplete && recentIndex !== null && praiseIndex >= 0;

  useEffect(() => saveSettings(id, settings), [id, settings]);

  useEffect(() => {
    if (!wrong) return;
    const timeout = window.setTimeout(() => setWrong(null), 420);
    return () => window.clearTimeout(timeout);
  }, [wrong]);

  useEffect(() => {
    if (recentIndex === null) return;
    const timeout = window.setTimeout(() => setRecentIndex(null), isComplete ? 1500 : 520);
    return () => window.clearTimeout(timeout);
  }, [isComplete, recentIndex]);

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
      if (isFinal) {
        setCelebrationPieces(createCelebrationPieces());
        setPraiseIndex((index) => (index + 1) % PRAISE.length);
      }
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

  function nextGroup() {
    changeRange(settings.size, (settings.range + 1) % ranges.length);
  }

  function updateSetting(key, value) {
    if (settings[key] === value) return;
    setSettings({ ...settings, [key]: value });
    if (key === "together") setAdultTurn(false);
    if (key === "motion" && !value) {
      setRecentIndex(null);
      setCelebrationPieces([]);
    }
  }

  return (
    <main className="game" data-motion={settings.motion}>
      <section className="game__panel" aria-label={`${name}ならべゲーム`}>
        <div className="game__top">
          <h1>{name}ならべ</h1>
          <div className="game__actions">
            <a className="home-button" href={import.meta.env.BASE_URL}>トップへ</a>
            <button className="icon-button" type="button" onClick={resetAnswer}
              aria-label="答えを消す" title="答えを消す"
              disabled={placedCount === 0 || isComplete}>
              ↺
            </button>
          </div>
        </div>

        <div className="game-controls">
          <div className="mode-buttons mode-buttons--size" role="group" aria-label="文字の数">
            {[["6", "6もじ"], ["12", "12もじ"], ["all", "ぜんぶ"]].map(([size, label]) => (
              <button key={size} type="button" aria-pressed={size === settings.size}
                onClick={() => { if (size !== settings.size) changeRange(size, 0); }}>
                {label}
              </button>
            ))}
          </div>
          <div className="mode-buttons mode-buttons--play" role="group" aria-label="あそびかた">
            <button type="button" aria-pressed={!settings.together}
              onClick={() => updateSetting("together", false)}>ひとりで</button>
            <button type="button" aria-pressed={settings.together}
              onClick={() => updateSetting("together", true)}>いっしょに</button>
          </div>
          <Settings settings={settings} ranges={ranges} changeRange={changeRange} updateSetting={updateSetting} />
        </div>

        {(settings.size !== "all" || settings.together) && <div className="round-info">
          {settings.size !== "all" && (
            <div className="range">
              <strong>{question.answer[0]} ～ {question.answer[question.answer.length - 1]}</strong>
              {!isComplete && (
                <button type="button" onClick={nextGroup}>つぎの文字グループ</button>
              )}
            </div>
          )}
          {settings.together && (
            <div className="turn" role="status">{adultTurn ? "おとなのばん" : "こどものばん"}</div>
          )}
        </div>}

        <div className={isComplete ? "message message--complete" : "message"}>
          <span className="message__prompt" aria-live="polite">
            {isComplete ? "できた！" : "じゅんばんに タップ"}
          </span>
          {showPraise && (
            <div className="praise" key={recentIndex} aria-hidden="true">
              <span lang="en">{PRAISE[praiseIndex]}</span>
            </div>
          )}
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
                {isRecent && (
                  <span className="mini-burst" aria-hidden="true">
                    {Array.from({ length: 8 }, (_, spark) => (
                      <span key={spark} style={{
                        "--spark-angle": `${spark * 45}deg`,
                        "--spark-color": CONFETTI_COLORS[spark % CONFETTI_COLORS.length],
                      }}>✦</span>
                    ))}
                  </span>
                )}
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
            <button className="next-button" type="button"
              onClick={settings.size === "all" ? () => startQuestion(question.answer) : nextGroup}>
              {settings.size === "all" ? "つぎのもんだい" : `つぎの${settings.size}もじ`}
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
