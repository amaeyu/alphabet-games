import { expect, test } from "@playwright/test";

const tapLetter = (page, letter) => page.getByRole("button", { name: `${letter}を選ぶ` }).click();
const placed = (page) => page.locator(".answer-slot--filled");

for (const [id, label, letters] of [
  ["greek", "ギリシア", "ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"],
  ["cyrillic", "キリル", "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"],
]) {
  test(`${id}: home link, full game, reset, completion and replay`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("./");
    await page.getByRole("link", { name: `${label}文字` }).click();
    await expect(page).toHaveURL(new RegExp(`/alphabet-games/${id}-game/$`));
    await expect(page.getByRole("heading", { name: `${label}文字ならべ` })).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(letters.length);
    await expect(page.locator(".letter-button")).toHaveCount(letters.length);

    await tapLetter(page, letters[1]);
    await expect(placed(page)).toHaveCount(0);
    await tapLetter(page, letters[0]);
    await expect(placed(page)).toHaveText([letters[0]]);
    await page.getByRole("button", { name: "答えを消す" }).click();
    await expect(placed(page)).toHaveCount(0);

    for (const letter of letters) await tapLetter(page, letter);
    await expect(placed(page)).toHaveText([...letters]);
    await expect(page.getByText("できた！")).toBeVisible();
    await expect(page.getByRole("button", { name: "答えを消す" })).toBeDisabled();
    await page.getByRole("button", { name: "つぎのもんだい" }).click();
    await expect(placed(page)).toHaveCount(0);
    await expect(page.locator(".letter-button:enabled")).toHaveCount(letters.length);
    expect(errors).toEqual([]);
  });
}

test("range changes confirm progress loss and save only settings", async ({ page }) => {
  await page.goto("cyrillic-game/");
  await page.getByText("せってい", { exact: true }).click();
  const size = page.getByLabel("文字の数");
  await size.selectOption("6");
  await expect(page.getByRole("listitem")).toHaveCount(6);
  await expect(page.locator(".range").getByText("А ～ Е", { exact: true })).toBeVisible();
  await tapLetter(page, "А");

  page.once("dialog", (dialog) => dialog.dismiss());
  await size.selectOption("12");
  await expect(size).toHaveValue("6");
  await expect(placed(page)).toHaveText(["А"]);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "つぎの文字グループ" }).click();
  await expect(page.getByLabel("文字の範囲")).toHaveValue("1");
  await expect(page.locator(".range").getByText("Ё ～ К", { exact: true })).toBeVisible();
  await expect(placed(page)).toHaveCount(0);

  await size.selectOption("12");
  await expect(page.getByRole("listitem")).toHaveCount(12);
  await page.getByLabel("文字の範囲").selectOption("2");
  await expect(page.locator(".range").getByText("Ф ～ Я", { exact: true })).toBeVisible();
  await tapLetter(page, "Ф");
  await page.reload();
  await expect(page.locator(".range").getByText("Ф ～ Я", { exact: true })).toBeVisible();
  await expect(placed(page)).toHaveCount(0);
});

test("communication and speech are independent from play, including after clearing", async ({ page }) => {
  await page.addInitScript(() => {
    window.spoken = [];
    window.effectsCreated = 0;
    Object.defineProperty(window, "AudioContext", {
      value: class { constructor() { window.effectsCreated++; } },
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [
          { lang: "ja-JP", localService: false },
          { lang: "ja-JP", localService: true },
        ],
        cancel() {},
        speak(utterance) { window.spoken.push([utterance.text, utterance.lang, utterance.voice.localService]); },
      },
    });
    window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
  });
  await page.goto("greek-game/");
  await page.getByText("せってい", { exact: true }).click();
  await page.getByLabel("文字の数").selectOption("6");
  await page.getByLabel("あそびかた").selectOption("together");
  await page.getByLabel("効果音").uncheck();
  await page.getByLabel("アニメーション").uncheck();

  const turn = page.locator(".turn");
  const message = page.locator(".communication__message");
  await expect(turn).toHaveText("こどものばん");
  await tapLetter(page, "Β");
  await expect(turn).toHaveText("こどものばん");
  await tapLetter(page, "Α");
  await expect(turn).toHaveText("おとなのばん");

  await page.getByRole("button", { name: "みて！" }).click();
  await expect(message).toHaveText("みて！");
  expect(await page.evaluate(() => window.spoken)).toEqual([["みて！", "ja-JP", true]]);
  await page.getByLabel("読み上げ").uncheck();
  await page.getByRole("button", { name: "もういっかい" }).click();
  await expect(message).toHaveText("もういっかい");
  await expect(turn).toHaveText("おとなのばん");
  await expect(placed(page)).toHaveText(["Α"]);

  await page.getByLabel("あそびかた").selectOption("solo");
  await expect(turn).toHaveCount(0);
  await expect(placed(page)).toHaveText(["Α"]);
  await page.getByLabel("あそびかた").selectOption("together");
  await expect(turn).toHaveText("こどものばん");
  for (const letter of "ΒΓΔΕΖ") await tapLetter(page, letter);
  await expect(turn).toHaveText("おとなのばん");
  await expect(page.getByText("できた！")).toBeVisible();
  await expect(page.locator(".confetti")).toHaveCount(0);
  await page.getByRole("button", { name: "てつだって" }).click();
  await expect(message).toHaveText("てつだって");
  await expect(placed(page)).toHaveCount(6);
  expect(await page.evaluate(() => window.spoken.length)).toBe(1);
  expect(await page.evaluate(() => window.effectsCreated)).toBe(0);

  await page.reload();
  await expect(turn).toHaveText("こどものばん");
  await page.getByText("せってい", { exact: true }).click();
  for (const setting of ["効果音", "読み上げ", "アニメーション"]) {
    await expect(page.getByLabel(setting)).not.toBeChecked();
  }
});

test("tablet portrait and landscape fit the full Cyrillic game and touch targets", async ({ page }, testInfo) => {
  for (const viewport of [{ width: 810, height: 1080 }, { width: 1080, height: 810 }]) {
    await page.setViewportSize(viewport);
    await page.goto("cyrillic-game/");
    const buttons = page.locator(".letter-button, .communication button");
    await expect(buttons).toHaveCount(36);
    const boxes = await buttons.evaluateAll((items) => items.map((item) => {
      const { left, right, top, bottom, width, height } = item.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    }));
    for (const [index, box] of boxes.entries()) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport.width);
      expect(box.bottom).toBeLessThanOrEqual(viewport.height);
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
      for (const other of boxes.slice(index + 1)) {
        expect(box.left < other.right && box.right > other.left &&
          box.top < other.bottom && box.bottom > other.top).toBe(false);
      }
    }
    const button = page.getByRole("button", { name: "みて！" });
    if (testInfo.project.name === "ipad-webkit") await button.tap();
    else await button.click();
    await expect(page.locator(".communication__message")).toHaveText("みて！");
    if (process.env.QA_SCREENSHOTS) {
      await page.screenshot({ path: testInfo.outputPath(`ipad-${viewport.width}.png`) });
    }
  }
});
