import assert from "node:assert/strict";
import test from "node:test";
import { ALPHABETS, createQuestion, DEFAULT_SETTINGS, getRanges, loadSettings, saveSettings } from "../src/game.js";

for (const [id, expectedCount] of [["greek", 24], ["cyrillic", 33]]) {
  const { letters } = ALPHABETS[id];

  test(`${id}: full alphabet and every contiguous range`, () => {
    assert.equal(letters.length, expectedCount);
    assert.equal(new Set(letters).size, expectedCount);
    assert.deepEqual(getRanges(letters, "all"), [letters]);

    for (const size of [6, 12]) {
      const ranges = getRanges(letters, String(size));
      assert.equal(ranges.length, Math.ceil(expectedCount / size));
      assert.deepEqual([...new Set(ranges.flat())], letters);
      for (const range of ranges) {
        const start = letters.indexOf(range[0]);
        assert.equal(range.length, size);
        assert.deepEqual(range, letters.slice(start, start + size));
      }
    }
  });

  test(`${id}: choices contain each answer once and are shuffled`, () => {
    for (const size of ["6", "12", "all"]) {
      for (const range of getRanges(letters, size)) {
        const question = createQuestion(range);
        assert.deepEqual(question.answer, range);
        assert.deepEqual([...question.choices].sort(), [...range].sort());
        assert.notDeepEqual(question.choices, range);
      }
    }
  });
}

test("settings are isolated per language and invalid storage falls back safely", () => {
  const data = new Map();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, value),
    },
  });

  assert.deepEqual(loadSettings("greek"), DEFAULT_SETTINGS);
  const settings = { ...DEFAULT_SETTINGS, size: "6", range: 2, speech: false };
  saveSettings("greek", settings);
  assert.deepEqual(loadSettings("greek"), settings);
  assert.deepEqual(loadSettings("cyrillic"), DEFAULT_SETTINGS);

  data.set("alphabet-games:v2:greek", '{"size":"12","range":4,"motion":"off","effects":false}');
  assert.deepEqual(loadSettings("greek"), { ...DEFAULT_SETTINGS, size: "12", effects: false });
  data.set("alphabet-games:v2:greek", "{bad JSON");
  assert.deepEqual(loadSettings("greek"), DEFAULT_SETTINGS);
});
