import assert from "node:assert/strict";
import test from "node:test";
import { readWorkspaceLocation, writeWorkspaceLocation } from "./url-state.js";

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
