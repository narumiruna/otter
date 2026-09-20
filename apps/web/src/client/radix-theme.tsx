import { Theme } from "@radix-ui/themes";
import { type ReactNode, useEffect, useState } from "react";

type Appearance = "dark" | "light";

function preferredAppearance(): Appearance {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function RadixTheme({ children }: { children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(preferredAppearance);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setAppearance(media.matches ? "dark" : "light");
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return (
    <Theme
      accentColor="green"
      appearance={appearance}
      grayColor="sage"
      hasBackground={false}
      panelBackground="translucent"
      radius="large"
      scaling="100%"
    >
      {children}
    </Theme>
  );
}
