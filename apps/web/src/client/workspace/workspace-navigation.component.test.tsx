// @vitest-environment jsdom

import { act, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { languageOptions } from "../i18n/locales.js";
import { translations } from "../i18n/messages.js";
import { TestI18nProvider } from "../test-providers.js";
import { readWorkspaceLocation } from "../url-state.js";
import { WorkspaceNavigation } from "./workspace-layout.js";

function mockViewport(mobile: boolean) {
  vi.stubGlobal("matchMedia", (media: string) => ({
    matches: mobile,
    media,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

for (const mobile of [false, true]) {
  test.each(languageOptions)(
    `${mobile ? "mobile" : "desktop"} navigation keeps all five pages in order in $locale`,
    async ({ locale }) => {
      mockViewport(mobile);
      const messages = translations[locale];
      const onNavigate = vi.fn();
      const onAdd = vi.fn();
      const view = render(
        <TestI18nProvider initialLocale={locale}>
          <WorkspaceNavigation
            archived={false}
            location={readWorkspaceLocation(
              new URL("https://otter.test/?trip=t&view=analysis"),
            )}
            onAdd={onAdd}
            onNavigate={onNavigate}
            showAdd
          />
        </TestI18nProvider>,
      );
      const nav = view.getByRole("navigation", {
        name: messages.groupWorkspace,
      });
      const buttons = within(nav).getAllByRole("button");
      expect(
        buttons.map((button) => button.getAttribute("aria-label")),
      ).toEqual([
        messages.overview,
        messages.expenses,
        messages.spendingAnalysis,
        messages.people,
        messages.groupSettings,
      ]);
      const analysis = within(nav).getByRole("button", {
        name: messages.spendingAnalysis,
      });
      expect(analysis).toHaveAttribute("aria-current", "page");
      expect(
        buttons.filter((button) => button.hasAttribute("aria-current")),
      ).toEqual([analysis]);
      await userEvent.setup().click(analysis);
      expect(onNavigate).toHaveBeenCalledWith("analysis");
      const add = view.queryByRole("button", {
        name: messages.addExpense,
      });
      if (mobile) {
        expect(add).toBeInTheDocument();
        expect(nav).not.toContainElement(add);
        if (!add) throw new Error("Missing add expense action");
        await userEvent.setup().click(add);
        expect(onAdd).toHaveBeenCalledOnce();
      } else expect(add).not.toBeInTheDocument();
    },
  );
}

test("mobile add action stays disabled for archived groups and respects showAdd", () => {
  mockViewport(true);
  const props = {
    archived: true,
    location: readWorkspaceLocation(
      new URL("https://otter.test/?view=analysis"),
    ),
    onAdd: vi.fn(),
    onNavigate: vi.fn(),
    showAdd: true,
  };
  const view = render(
    <TestI18nProvider initialLocale="en">
      <WorkspaceNavigation {...props} />
    </TestI18nProvider>,
  );
  expect(view.getByRole("button", { name: "Add expense" })).toBeDisabled();
  view.rerender(
    <TestI18nProvider initialLocale="en">
      <WorkspaceNavigation {...props} showAdd={false} />
    </TestI18nProvider>,
  );
  expect(
    view.queryByRole("button", { name: "Add expense" }),
  ).not.toBeInTheDocument();
});

test("mobile space follows the control height and releases the resize observer", () => {
  mockViewport(true);
  let height = 160;
  let resize = () => {};
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    () => new DOMRect(0, 0, 320, height),
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe = observe;
      disconnect = disconnect;
    },
  );
  const view = render(
    <TestI18nProvider initialLocale="en">
      <WorkspaceNavigation
        archived={false}
        location={readWorkspaceLocation(
          new URL("https://otter.test/?view=analysis"),
        )}
        onAdd={vi.fn()}
        onNavigate={vi.fn()}
        showAdd
      />
    </TestI18nProvider>,
  );
  const spacer = view.container.querySelector(".workspace-navigation");
  expect(observe).toHaveBeenCalledOnce();
  expect(spacer).toHaveStyle({ height: "160px" });
  height = 240;
  act(() => resize());
  expect(spacer).toHaveStyle({ height: "240px" });
  view.unmount();
  expect(disconnect).toHaveBeenCalledOnce();
});

test("composer mode does not mark a page as current", () => {
  mockViewport(false);
  const view = render(
    <TestI18nProvider initialLocale="en">
      <WorkspaceNavigation
        archived={false}
        location={readWorkspaceLocation(
          new URL("https://otter.test/?view=analysis&mode=add-expense"),
        )}
        onAdd={vi.fn()}
        onNavigate={vi.fn()}
        showAdd
      />
    </TestI18nProvider>,
  );
  expect(
    view
      .getAllByRole("button")
      .filter((button) => button.hasAttribute("aria-current")),
  ).toEqual([]);
});
