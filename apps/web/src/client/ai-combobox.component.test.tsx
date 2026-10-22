// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { AiCombobox } from "./ai-combobox.js";
import { I18nProvider } from "./i18n.js";

const options = [
  { id: "anthropic", name: "Anthropic" },
  { id: "openai-codex", name: "OpenAI Codex" },
  { id: "google-gemini-cli", name: "Gemini" },
];

function setup(disabled = false) {
  const onChange = vi.fn();
  function Example() {
    const [value, setValue] = useState("anthropic");
    return (
      <I18nProvider initialLocale="en">
        <form onSubmit={(event) => event.preventDefault()}>
          <AiCombobox
            id="provider"
            label="Provider"
            noResults="No matching options"
            placeholder="Search providers…"
            disabled={disabled}
            options={options}
            value={value}
            onChange={(next) => {
              setValue(next);
              onChange(next);
            }}
          />
          <button type="submit">Save</button>
        </form>
      </I18nProvider>
    );
  }
  render(<Example />);
  return {
    input: screen.getByRole("combobox", { name: "Provider" }),
    onChange,
    user: userEvent.setup(),
  };
}

test.each(["cOdEx", "OPENAI-CODEX", "  openai  "])(
  "searches provider names and IDs without case sensitivity: %s",
  async (query) => {
    const { input, user, onChange } = setup();
    await user.click(input);
    await user.type(input, query);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(
      screen.getByRole("option", { name: "OpenAI Codex openai-codex" }),
    );
    expect(input).toHaveValue("OpenAI Codex");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onChange).toHaveBeenCalledExactlyOnceWith("openai-codex");
  },
);

test("supports arrows and Enter without submitting the enclosing form", async () => {
  const { input, user, onChange } = setup();
  const submit = vi.fn();
  input.closest("form")?.addEventListener("submit", submit);
  await user.tab();
  expect(input).toHaveFocus();
  expect(input).toHaveAttribute("aria-expanded", "true");
  await user.keyboard("{ArrowDown}{ArrowDown}{ArrowUp}");
  const active = screen.getByRole("option", {
    name: "OpenAI Codex openai-codex",
  });
  expect(input).toHaveAttribute("aria-activedescendant", active.id);
  await user.keyboard("{Enter}");
  expect(onChange).toHaveBeenCalledExactlyOnceWith("openai-codex");
  expect(submit).not.toHaveBeenCalled();
  expect(input).toHaveValue("OpenAI Codex");
  await user.keyboard("{Enter}");
  expect(submit).not.toHaveBeenCalled();
  expect(onChange).toHaveBeenCalledOnce();
  await user.keyboard("{ArrowDown}");
  expect(input).toHaveAttribute("aria-expanded", "true");
});

test.each(["{Escape}", "{Tab}"])(
  "closes with %s and discards uncommitted search",
  async (key) => {
    const { input, user, onChange } = setup();
    await user.click(input);
    await user.type(input, "gemini");
    await user.keyboard(key);
    expect(input).toHaveValue("Anthropic");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).not.toHaveAttribute("aria-activedescendant");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
    if (key === "{Tab}")
      expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  },
);

test("reports no results, ignores Enter, and restores the selected value on blur", async () => {
  const { input, user, onChange } = setup();
  await user.click(input);
  await user.type(input, "missing provider");
  expect(screen.getByRole("status")).toHaveTextContent("No matching options");
  expect(screen.queryByRole("option")).not.toBeInTheDocument();
  await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");
  expect(onChange).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Save" }));
  expect(input).toHaveValue("Anthropic");
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
});

test("disabled combobox cannot open or change", async () => {
  const { input, user, onChange } = setup(true);
  expect(input).toBeDisabled();
  await user.click(input);
  await user.tab();
  expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  expect(onChange).not.toHaveBeenCalled();
});
