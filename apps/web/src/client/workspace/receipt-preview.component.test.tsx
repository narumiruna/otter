// @vitest-environment jsdom

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { I18nProvider } from "../i18n.js";
import { ReceiptPreview } from "./receipt-preview.js";

test("receipt preview opens in place and closes from the image or keyboard", async () => {
  const user = userEvent.setup();
  render(
    <I18nProvider initialLocale="en">
      <ReceiptPreview compact name="Dinner" url="/receipt.png" />
    </I18nProvider>,
  );

  const trigger = screen.getByRole("button", {
    name: "View receipt for Dinner",
  });
  await user.click(trigger);

  const dialog = screen.getByRole("dialog", { name: "Receipt for “Dinner”" });
  expect(
    within(dialog).getByRole("img", { name: "Receipt image for Dinner" }),
  ).toHaveAttribute("src", "/receipt.png");
  expect(
    within(dialog).getByRole("link", { name: "Open original image" }),
  ).toHaveAttribute("href", "/receipt.png");

  await user.click(
    within(dialog).getByRole("button", { name: "Close receipt preview" }),
  );
  await waitFor(() => expect(dialog).not.toBeInTheDocument());
  expect(trigger).toHaveFocus();

  await user.click(trigger);
  expect(screen.getByRole("dialog")).toBeVisible();
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(trigger).toHaveFocus();
});
