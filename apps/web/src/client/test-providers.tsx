import { Theme } from "@radix-ui/themes";
import type { ComponentProps } from "react";
import { I18nProvider } from "./i18n.js";

/** Supply the locale and Radix context used by workspace controls. */
export function TestI18nProvider(props: ComponentProps<typeof I18nProvider>) {
  return (
    <Theme>
      <I18nProvider {...props} />
    </Theme>
  );
}
