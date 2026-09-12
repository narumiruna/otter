import { expect, type Page } from "@playwright/test";

export async function expectNoOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        bodyOverflow: Math.max(
          0,
          document.body.scrollWidth - window.innerWidth,
        ),
        documentOverflow: Math.max(
          0,
          document.documentElement.scrollWidth - window.innerWidth,
        ),
      })),
    )
    .toEqual({ bodyOverflow: 0, documentOverflow: 0 });
}
