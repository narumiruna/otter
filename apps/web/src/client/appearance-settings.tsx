import {
  CheckIcon,
  DesktopIcon,
  MoonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import { useI18n } from "./i18n.js";
import {
  type ThemeAppearance,
  type ThemePalette,
  themePalettes,
  useThemePreference,
} from "./radix-theme.js";

const paletteMessageKeys = {
  forest: "forestTheme",
  lavender: "lavenderTheme",
  ocean: "oceanTheme",
  rose: "roseTheme",
  sunset: "sunsetTheme",
} as const satisfies Record<ThemePalette, string>;

const appearanceOptions = [
  { icon: DesktopIcon, id: "system", messageKey: "systemMode" },
  { icon: SunIcon, id: "light", messageKey: "lightMode" },
  { icon: MoonIcon, id: "dark", messageKey: "darkMode" },
] as const satisfies ReadonlyArray<{
  icon: typeof DesktopIcon;
  id: ThemeAppearance;
  messageKey: string;
}>;

export function AppearanceSettings() {
  const { messages } = useI18n();
  const { appearance, palette, setAppearance, setPalette } =
    useThemePreference();

  return (
    <section
      className="account-settings-section appearance-settings"
      aria-labelledby="appearance-settings-heading"
    >
      <div className="account-settings-section-heading">
        <h3 id="appearance-settings-heading">{messages.appearance}</h3>
        <p>{messages.chooseHowOtterLooksOnThisBrowser}</p>
      </div>
      <fieldset className="appearance-fieldset">
        <legend>{messages.colorTheme}</legend>
        <div className="theme-palette-grid">
          {themePalettes.map(({ id }) => (
            <label className="theme-palette-option" data-palette={id} key={id}>
              <input
                checked={palette === id}
                className="sr-only"
                name="theme-palette"
                onChange={() => setPalette(id)}
                type="radio"
                value={id}
              />
              <span className="theme-palette-preview" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
              <span className="theme-palette-name">
                {messages[paletteMessageKeys[id]]}
              </span>
              <CheckIcon className="theme-option-check" aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="appearance-fieldset">
        <legend>{messages.displayMode}</legend>
        <div className="appearance-mode-grid">
          {appearanceOptions.map(({ icon: Icon, id, messageKey }) => (
            <label className="appearance-mode-option" key={id}>
              <input
                checked={appearance === id}
                className="sr-only"
                name="theme-appearance"
                onChange={() => setAppearance(id)}
                type="radio"
                value={id}
              />
              <Icon aria-hidden="true" />
              <span>{messages[messageKey]}</span>
              <CheckIcon className="theme-option-check" aria-hidden="true" />
            </label>
          ))}
        </div>
      </fieldset>
    </section>
  );
}
