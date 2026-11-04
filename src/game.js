export const ALPHABETS = {
  greek: { name: "ギリシア", letters: [..."ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"] },
  cyrillic: { name: "キリル", letters: [..."АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"] },
};

export const DEFAULT_SETTINGS = {
  size: "all",
  range: 0,
  together: false,
  effects: true,
  speech: true,
  motion: true,
};

export function getRanges(letters, size) {
  if (size === "all") return [letters];

  const count = Number(size);
  // Keep the last group at full length while including the final letter.
  return Array.from({ length: Math.ceil(letters.length / count) }, (_, index) => {
    const start = Math.min(index * count, letters.length - count);
    return letters.slice(start, start + count);
  });
}

export function createQuestion(answer) {
  const choices = [...answer];

  for (let index = choices.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [choices[index], choices[randomIndex]] = [choices[randomIndex], choices[index]];
  }

  if (choices.every((letter, index) => letter === answer[index])) {
    [choices[0], choices[1]] = [choices[1], choices[0]];
  }

  return { answer, choices };
}

function normalizeSettings(value, letters) {
  const size = ["6", "12", "all"].includes(value?.size) ? value.size : "all";
  const range = Number.isInteger(value?.range) &&
    value.range >= 0 && value.range < getRanges(letters, size).length ? value.range : 0;
  const settings = { ...DEFAULT_SETTINGS, size, range };

  for (const key of ["together", "effects", "speech", "motion"]) {
    if (typeof value?.[key] === "boolean") settings[key] = value[key];
  }

  return settings;
}

export function loadSettings(id) {
  try {
    const stored = globalThis.localStorage.getItem(`alphabet-games:v2:${id}`);
    return normalizeSettings(JSON.parse(stored), ALPHABETS[id].letters);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(id, settings) {
  try {
    globalThis.localStorage.setItem(`alphabet-games:v2:${id}`, JSON.stringify(settings));
  } catch {
    // The current session remains playable when storage is unavailable.
  }
}
