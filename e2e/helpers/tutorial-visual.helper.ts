import type { Locator, Page } from "@playwright/test";

const HIGHLIGHT_MS = Number(process.env.E2E_TUTORIAL_HIGHLIGHT_MS ?? "1400");
const CURSOR_MOVE_MS = Number(process.env.E2E_TUTORIAL_CURSOR_MOVE_MS ?? "450");

const LOCATOR_CHAIN_METHODS = new Set([
  "and",
  "filter",
  "first",
  "last",
  "locator",
  "nth",
  "or",
  "getByAltText",
  "getByLabel",
  "getByPlaceholder",
  "getByRole",
  "getByTestId",
  "getByText",
  "getByTitle",
]);

const ACTION_METHODS = new Set([
  "check",
  "click",
  "dblclick",
  "fill",
  "press",
  "pressSequentially",
  "selectOption",
  "setInputFiles",
  "tap",
  "uncheck",
]);

const WRAPPED_LOCATOR = Symbol("tutorial-wrapped-locator");

const TUTORIAL_VISUALS_STYLE = `
  @keyframes e2e-tutorial-ring-pulse {
    0%, 100% {
      box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.95), 0 0 0 10px rgba(245, 158, 11, 0.25);
    }
    50% {
      box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.95), 0 0 0 14px rgba(239, 68, 68, 0.2);
    }
  }

  .e2e-tutorial-target {
    outline: 3px solid #f59e0b !important;
    outline-offset: 3px !important;
    animation: e2e-tutorial-ring-pulse 900ms ease-in-out infinite;
    scroll-margin: 24px;
  }

  #e2e-tutorial-cursor {
    position: fixed;
    left: 0;
    top: 0;
    width: 22px;
    height: 22px;
    margin-left: -3px;
    margin-top: -3px;
    border-radius: 9999px;
    border: 2px solid #ffffff;
    background: rgba(245, 158, 11, 0.95);
    box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.35), 0 8px 18px rgba(15, 23, 42, 0.35);
    pointer-events: none;
    z-index: 2147483646;
    opacity: 0;
    transform: translate(-9999px, -9999px) scale(0.85);
    transition:
      transform ${CURSOR_MOVE_MS}ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 180ms ease;
  }

  #e2e-tutorial-cursor.is-visible {
    opacity: 1;
    transform: translate(var(--e2e-cursor-x, 0px), var(--e2e-cursor-y, 0px)) scale(1);
  }

  #e2e-tutorial-cursor.is-clicking {
    transform: translate(var(--e2e-cursor-x, 0px), var(--e2e-cursor-y, 0px)) scale(0.78);
  }

  #e2e-tutorial-click-ring {
    position: fixed;
    left: 0;
    top: 0;
    width: 18px;
    height: 18px;
    margin-left: -9px;
    margin-top: -9px;
    border-radius: 9999px;
    border: 3px solid rgba(245, 158, 11, 0.95);
    pointer-events: none;
    z-index: 2147483645;
    opacity: 0;
    transform: translate(-9999px, -9999px) scale(0.4);
  }

  #e2e-tutorial-click-ring.is-active {
    animation: e2e-tutorial-click-burst 520ms ease-out forwards;
  }

  @keyframes e2e-tutorial-click-burst {
    0% {
      opacity: 0.95;
      transform: translate(var(--e2e-ring-x, 0px), var(--e2e-ring-y, 0px)) scale(0.45);
    }
    100% {
      opacity: 0;
      transform: translate(var(--e2e-ring-x, 0px), var(--e2e-ring-y, 0px)) scale(2.2);
    }
  }
`;

export async function installTutorialVisuals(page: Page): Promise<void> {
  await page.addInitScript((styleText: string) => {
    const install = (): void => {
      if (document.getElementById("e2e-tutorial-visuals-style")) {
        return;
      }

      const style = document.createElement("style");
      style.id = "e2e-tutorial-visuals-style";
      style.textContent = styleText;
      document.head.appendChild(style);

      const cursor = document.createElement("div");
      cursor.id = "e2e-tutorial-cursor";
      cursor.setAttribute("aria-hidden", "true");
      document.body.appendChild(cursor);

      const ring = document.createElement("div");
      ring.id = "e2e-tutorial-click-ring";
      ring.setAttribute("aria-hidden", "true");
      document.body.appendChild(ring);
    };

    if (document.body) {
      install();
      return;
    }

    document.addEventListener("DOMContentLoaded", install, { once: true });
  }, TUTORIAL_VISUALS_STYLE);
}

async function revealTutorialTarget(
  page: Page,
  locator: Locator,
): Promise<void> {
  await locator
    .first()
    .scrollIntoViewIfNeeded()
    .catch(() => undefined);

  const box = await locator
    .first()
    .boundingBox()
    .catch(() => null);
  if (!box) {
    await locator
      .first()
      .highlight()
      .catch(() => undefined);
    await page.waitForTimeout(HIGHLIGHT_MS);
    return;
  }

  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  await locator
    .first()
    .evaluate((element) => {
      element.classList.add("e2e-tutorial-target");
    })
    .catch(() => undefined);

  await page
    .evaluate(
      ({ x, y, moveMs }) => {
        const cursor = document.getElementById("e2e-tutorial-cursor");
        const ring = document.getElementById("e2e-tutorial-click-ring");
        if (!cursor || !ring) {
          return;
        }

        cursor.style.setProperty("--e2e-cursor-x", `${x}px`);
        cursor.style.setProperty("--e2e-cursor-y", `${y}px`);
        cursor.classList.add("is-visible");

        ring.style.setProperty("--e2e-ring-x", `${x}px`);
        ring.style.setProperty("--e2e-ring-y", `${y}px`);
        ring.classList.remove("is-active");
        void ring.offsetWidth;
        ring.classList.add("is-active");

        window.setTimeout(() => {
          cursor.classList.add("is-clicking");
          window.setTimeout(() => cursor.classList.remove("is-clicking"), 180);
        }, moveMs);
      },
      { x: centerX, y: centerY, moveMs: CURSOR_MOVE_MS },
    )
    .catch(() => undefined);

  await page.waitForTimeout(HIGHLIGHT_MS);

  await locator
    .first()
    .evaluate((element) => {
      element.classList.remove("e2e-tutorial-target");
    })
    .catch(() => undefined);
}

function wrapLocator(page: Page, locator: Locator): Locator {
  if ((locator as unknown as Record<symbol, boolean>)[WRAPPED_LOCATOR]) {
    return locator;
  }

  const wrapped = new Proxy(locator, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") {
        return value;
      }

      const method = String(property);

      if (ACTION_METHODS.has(method)) {
        return async (...args: unknown[]) => {
          await revealTutorialTarget(page, target);
          return Reflect.apply(value, target, args);
        };
      }

      if (LOCATOR_CHAIN_METHODS.has(method)) {
        return (...args: unknown[]) =>
          wrapLocator(page, Reflect.apply(value, target, args) as Locator);
      }

      return value.bind(target);
    },
  });

  (wrapped as unknown as Record<symbol, boolean>)[WRAPPED_LOCATOR] = true;
  return wrapped;
}

function wrapPageLocators(page: Page): void {
  const pageWithLocators = page as Page & Record<string, unknown>;
  const locatorFactories = [
    "getByAltText",
    "getByLabel",
    "getByPlaceholder",
    "getByRole",
    "getByTestId",
    "getByText",
    "getByTitle",
    "locator",
  ] as const;

  for (const factory of locatorFactories) {
    const original = page[factory].bind(page) as (
      ...args: unknown[]
    ) => Locator;
    pageWithLocators[factory] = (...args: unknown[]) =>
      wrapLocator(page, original(...args));
  }
}

export async function prepareTutorialPage(page: Page): Promise<void> {
  if (process.env.E2E_TUTORIAL_VISUALS === "0") {
    return;
  }

  await installTutorialVisuals(page);
  wrapPageLocators(page);
}
