// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { expect, test } from "vitest";
import { AccountSettingsPage } from "../../client/account-settings-page.js";
import { ApiTokenSettings } from "../../client/api-token-settings.js";
import { AuthScreen } from "../../client/auth-screen.js";
import { DeviceAuthorization } from "../../client/device-authorization.js";
import { I18nProvider } from "../../client/i18n.js";

const screens = [
  {
    name: "authentication",
    screen: (
      <AuthScreen onLogin={() => undefined} onRegister={() => undefined} />
    ),
  },
  {
    name: "account settings",
    screen: (
      <AccountSettingsPage
        offline
        onClose={() => undefined}
        onUpdate={async () => undefined}
        user={{ id: "user", name: "Alice", username: "alice" }}
      />
    ),
  },
  {
    name: "device authorization",
    screen: <DeviceAuthorization initialCode="" />,
  },
  { name: "API tokens", screen: <ApiTokenSettings offline /> },
];

test.each(screens)(
  "$name keeps vertical field markup and labels",
  ({ screen }) => {
    const { container } = render(
      <I18nProvider initialLocale="en">{screen}</I18nProvider>,
    );
    const fields = container.querySelectorAll("fieldset[data-slot=field]");
    expect(fields.length).toBeGreaterThan(0);
    for (const field of fields) {
      expect(field).toHaveAttribute("data-orientation", "vertical");
      expect(field).toHaveClass(
        "group/field",
        "flex",
        "w-full",
        "gap-2",
        "data-[invalid=true]:text-destructive",
        "flex-col",
        "*:w-full",
        "[&>.sr-only]:w-auto",
      );
      const label = field.querySelector("label[data-slot=field-label]");
      expect(label).not.toBeNull();
      const input = field.querySelector("input");
      expect(input).not.toBeNull();
      expect(label).toHaveAttribute("for", input?.id);
      expect(input).toHaveAccessibleName(label?.textContent ?? "");
    }
  },
);
