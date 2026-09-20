import assert from "node:assert/strict";
import { test } from "vitest";
import {
  isAccountSettingsLocation,
  readWorkspaceLocation,
  withoutAccountSettingsLocation,
  writeAccountSettingsLocation,
  writeWorkspaceLocation,
} from "./url-state.js";

test("account settings URL state preserves the workspace location", () => {
  const source = new URL(
    "https://otter.test/?trip=trip_1&view=expenses&campaign=friends#details",
  );
  const opened = writeAccountSettingsLocation(source, true);

  assert.equal(
    opened,
    "/?trip=trip_1&view=expenses&campaign=friends&account=settings#details",
  );
  assert.equal(isAccountSettingsLocation(new URL(opened, source)), true);
  assert.equal(
    writeAccountSettingsLocation(new URL(opened, source), false),
    "/?trip=trip_1&view=expenses&campaign=friends#details",
  );
});

test("bootstrap locations ignore account settings state", () => {
  const result = withoutAccountSettingsLocation(
    new URL(
      "https://otter.test/?trip=trip_1&account=settings&campaign=friends",
    ),
  );

  assert.equal(result.pathname, "/");
  assert.equal(result.search, "?trip=trip_1&campaign=friends");
});

test("workspace URL state reads valid owned parameters", () => {
  assert.deepEqual(
    readWorkspaceLocation(
      new URL("https://otter.test/?trip=trip_1&view=expenses&mode=add-expense"),
    ),
    { mode: "add-expense", tripId: "trip_1", view: "expenses" },
  );
});

test("workspace URL state rejects invalid owned values", () => {
  assert.deepEqual(
    readWorkspaceLocation(
      new URL("https://otter.test/?trip=&view=unknown&mode=edit"),
    ),
    { mode: null, tripId: null, view: "overview" },
  );
});

test("workspace URL writes preserve unknown parameters", () => {
  const result = writeWorkspaceLocation(
    new URL("https://otter.test/?campaign=friends&view=overview"),
    { mode: "add-expense", tripId: "trip_2", view: "people" },
  );
  assert.equal(
    result,
    "/?campaign=friends&view=people&trip=trip_2&mode=add-expense",
  );
});

test("workspace URL removes absent owned values without touching the path", () => {
  const result = writeWorkspaceLocation(
    new URL("https://otter.test/gateway?trip=old&mode=add-expense&keep=1"),
    { mode: null, tripId: null, view: "overview" },
  );
  assert.equal(result, "/gateway?keep=1");
});
