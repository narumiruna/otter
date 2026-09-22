// @vitest-environment jsdom

import { act, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadixTheme,
  type ThemeAppearance,
  useThemePreference,
} from "./radix-theme.js";

const storedValues = new Map<string, string>();

function installMatchMedia(initialDark: boolean) {
  let dark = initialDark;
  const listeners = new Set<() => void>();
  const media = {
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    get matches() {
      return dark;
    },
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  };
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn(() => media),
  });
  return (nextDark: boolean) => {
    dark = nextDark;
    for (const listener of listeners) listener();
  };
}

beforeEach(() => {
  storedValues.clear();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: (key: string, value: string) => storedValues.set(key, value),
    },
  });
  installMatchMedia(false);
});

function ThemeControls() {
  const { appearance, palette, resolvedAppearance, setAppearance, setPalette } =
    useThemePreference();
  return (
    <div>
      <output>{`${palette}/${appearance}/${resolvedAppearance}`}</output>
      <button onClick={() => setPalette("ocean")} type="button">
        Ocean
      </button>
      {(["system", "light", "dark"] as ThemeAppearance[]).map((mode) => (
        <button key={mode} onClick={() => setAppearance(mode)} type="button">
          {mode}
        </button>
      ))}
    </div>
  );
}

test("uses the default palette and follows live system appearance changes", () => {
  const updateSystemAppearance = installMatchMedia(true);
  const view = render(
    <RadixTheme>
      <ThemeControls />
    </RadixTheme>,
  );

  const theme = view.container.querySelector(".radix-themes");
  expect(theme).toHaveAttribute("data-theme-palette", "forest");
  expect(theme).toHaveAttribute("data-accent-color", "green");
  expect(theme).toHaveAttribute("data-gray-color", "sage");
  expect(theme).toHaveClass("dark");
  expect(view.getByText("forest/system/dark")).toBeVisible();

  act(() => updateSystemAppearance(false));
  expect(theme).toHaveClass("light");
  expect(view.getByText("forest/system/light")).toBeVisible();
});

test("applies and persists explicit palette and appearance choices", async () => {
  const updateSystemAppearance = installMatchMedia(false);
  const user = userEvent.setup();
  const view = render(
    <RadixTheme>
      <ThemeControls />
    </RadixTheme>,
  );

  await user.click(view.getByRole("button", { name: "Ocean" }));
  await user.click(view.getByRole("button", { name: "dark" }));

  const theme = view.container.querySelector(".radix-themes");
  expect(theme).toHaveAttribute("data-theme-palette", "ocean");
  expect(theme).toHaveAttribute("data-accent-color", "blue");
  expect(theme).toHaveAttribute("data-gray-color", "slate");
  expect(theme).toHaveClass("dark");
  act(() => updateSystemAppearance(false));
  expect(theme).toHaveClass("dark");
  expect(JSON.parse(storedValues.get("otter.theme") ?? "")).toEqual({
    appearance: "dark",
    palette: "ocean",
  });

  view.unmount();
  const restored = render(
    <RadixTheme>
      <ThemeControls />
    </RadixTheme>,
  );
  expect(restored.getByText("ocean/dark/dark")).toBeVisible();
});

test("passes the selected theme through portal content", () => {
  storedValues.set("otter.theme", '{"appearance":"dark","palette":"ocean"}');
  render(
    <RadixTheme>
      <Dialog open>
        <DialogContent showCloseButton={false}>
          <DialogTitle>Theme preview</DialogTitle>
          <DialogDescription>Portal content</DialogDescription>
        </DialogContent>
      </Dialog>
    </RadixTheme>,
  );

  const portalTheme = document.querySelector(".radix-dialog-theme");
  expect(portalTheme).toHaveAttribute("data-accent-color", "blue");
  expect(portalTheme).toHaveAttribute("data-gray-color", "slate");
  expect(portalTheme).toHaveClass("dark");
});

test("ignores invalid storage and keeps switching when storage is unavailable", async () => {
  storedValues.set(
    "otter.theme",
    '{"appearance":"midnight","palette":"ocean"}',
  );
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => storedValues.get(key) ?? null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    },
  });
  const user = userEvent.setup();
  const view = render(
    <RadixTheme>
      <ThemeControls />
    </RadixTheme>,
  );

  expect(view.getByText("forest/system/light")).toBeVisible();
  await user.click(view.getByRole("button", { name: "Ocean" }));
  await user.click(view.getByRole("button", { name: "dark" }));
  expect(view.getByText("ocean/dark/dark")).toBeVisible();
});
