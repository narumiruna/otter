import { Theme } from "@radix-ui/themes";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const themePalettes = [
  { accentColor: "green", grayColor: "sage", id: "forest" },
  { accentColor: "blue", grayColor: "slate", id: "ocean" },
  { accentColor: "violet", grayColor: "mauve", id: "lavender" },
  { accentColor: "orange", grayColor: "sand", id: "sunset" },
  { accentColor: "crimson", grayColor: "mauve", id: "rose" },
] as const;

export type ThemePalette = (typeof themePalettes)[number]["id"];
export type ThemeAppearance = "system" | "light" | "dark";
type ResolvedAppearance = Exclude<ThemeAppearance, "system">;

type ThemePreference = {
  appearance: ThemeAppearance;
  palette: ThemePalette;
};

type ThemePreferenceContextValue = {
  appearance: ThemeAppearance;
  palette: ThemePalette;
  resolvedAppearance: ResolvedAppearance;
  setAppearance: (appearance: ThemeAppearance) => void;
  setPalette: (palette: ThemePalette) => void;
};

const storageKey = "otter.theme";
const defaultPreference: ThemePreference = {
  appearance: "system",
  palette: "forest",
};

function isThemePalette(value: unknown): value is ThemePalette {
  return themePalettes.some((palette) => palette.id === value);
}

function isThemeAppearance(value: unknown): value is ThemeAppearance {
  return value === "system" || value === "light" || value === "dark";
}

function storedPreference(): ThemePreference {
  if (typeof window === "undefined") return defaultPreference;
  try {
    const saved = window.localStorage?.getItem(storageKey);
    if (!saved) return defaultPreference;
    const value: unknown = JSON.parse(saved);
    if (typeof value === "object" && value !== null) {
      const appearance: unknown = Reflect.get(value, "appearance");
      const palette: unknown = Reflect.get(value, "palette");
      if (isThemeAppearance(appearance) && isThemePalette(palette)) {
        return { appearance, palette };
      }
    }
  } catch {
    // The default theme remains available when browser storage is unavailable.
  }
  return defaultPreference;
}

function persistPreference(preference: ThemePreference) {
  try {
    window.localStorage?.setItem(storageKey, JSON.stringify(preference));
  } catch {
    // Theme switching still works in memory when browser storage is unavailable.
  }
}

function preferredAppearance(): ResolvedAppearance {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

const ThemePreferenceContext = createContext<ThemePreferenceContextValue>({
  ...defaultPreference,
  resolvedAppearance: "light",
  setAppearance: () => undefined,
  setPalette: () => undefined,
});

export function RadixTheme({ children }: { children: ReactNode }) {
  const [preference, setPreference] =
    useState<ThemePreference>(storedPreference);
  const [systemAppearance, setSystemAppearance] =
    useState<ResolvedAppearance>(preferredAppearance);

  useEffect(() => {
    if (!window.matchMedia) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemAppearance(media.matches ? "dark" : "light");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolvedAppearance =
    preference.appearance === "system"
      ? systemAppearance
      : preference.appearance;
  const palette =
    themePalettes.find(({ id }) => id === preference.palette) ??
    themePalettes[0];
  const value = useMemo<ThemePreferenceContextValue>(
    () => ({
      ...preference,
      resolvedAppearance,
      setAppearance: (appearance) =>
        setPreference((current) => {
          const next = { ...current, appearance };
          persistPreference(next);
          return next;
        }),
      setPalette: (nextPalette) =>
        setPreference((current) => {
          const next = { ...current, palette: nextPalette };
          persistPreference(next);
          return next;
        }),
    }),
    [preference, resolvedAppearance],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      <Theme
        accentColor={palette.accentColor}
        appearance={resolvedAppearance}
        data-theme-palette={palette.id}
        grayColor={palette.grayColor}
        hasBackground={false}
        panelBackground="translucent"
        radius="large"
        scaling="100%"
      >
        {children}
      </Theme>
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreferenceContextValue {
  return useContext(ThemePreferenceContext);
}
