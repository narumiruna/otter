// @vitest-environment jsdom

import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { AppearanceSettings } from "./appearance-settings.js";
import { I18nProvider } from "./i18n.js";
import { RadixTheme } from "./radix-theme.js";

const storedValues = new Map<string, string>();

beforeEach(() => {
  storedValues.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
    },
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => ({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    })),
  });
});

test("offers localized color themes and appearance modes", () => {
  const view = render(
    <I18nProvider initialLocale="zh-TW">
      <RadixTheme>
        <AppearanceSettings />
      </RadixTheme>
    </I18nProvider>,
  );

  const palettes = view.getByRole("group", { name: "色彩主題" });
  expect(within(palettes).getAllByRole("radio")).toHaveLength(5);
  expect(within(palettes).getByRole("radio", { name: "森林" })).toBeChecked();
  expect(within(palettes).getByRole("radio", { name: "海洋" })).toBeVisible();
  expect(within(palettes).getByRole("radio", { name: "薰衣草" })).toBeVisible();
  expect(within(palettes).getByRole("radio", { name: "夕陽" })).toBeVisible();
  expect(within(palettes).getByRole("radio", { name: "玫瑰" })).toBeVisible();

  const modes = view.getByRole("group", { name: "顯示模式" });
  expect(within(modes).getAllByRole("radio")).toHaveLength(3);
  expect(within(modes).getByRole("radio", { name: "跟隨系統" })).toBeChecked();
});

test("applies color and appearance selections immediately", async () => {
  const user = userEvent.setup();
  const view = render(
    <I18nProvider initialLocale="en">
      <RadixTheme>
        <AppearanceSettings />
      </RadixTheme>
    </I18nProvider>,
  );

  await user.click(view.getByRole("radio", { name: "Ocean" }));
  await user.click(view.getByRole("radio", { name: "Dark" }));

  expect(view.getByRole("radio", { name: "Ocean" })).toBeChecked();
  expect(view.getByRole("radio", { name: "Dark" })).toBeChecked();
  const theme = view.container.querySelector(".radix-themes");
  expect(theme).toHaveAttribute("data-theme-palette", "ocean");
  expect(theme).toHaveAttribute("data-accent-color", "blue");
  expect(theme).toHaveClass("dark");
  expect(JSON.parse(storedValues.get("otter.theme") ?? "")).toEqual({
    appearance: "dark",
    palette: "ocean",
  });
});
