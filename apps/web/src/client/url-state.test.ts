import assert from "node:assert/strict";
import { test } from "vitest";
import {
  isAccountSettingsLocation,
  isSameWorkspaceLocation,
  readWorkspaceLocation,
  type WorkspaceLocation,
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
    {
      expenseId: null,
      mode: "add-expense",
      tripId: "trip_1",
      view: "expenses",
    },
  );
});

test("analysis URL state survives account settings and preserves other parameters", () => {
  const source = new URL(
    "https://otter.test/?trip=trip_1&view=analysis&campaign=friends#details",
  );
  const location = readWorkspaceLocation(source);
  assert.deepEqual(location, {
    expenseId: null,
    mode: null,
    tripId: "trip_1",
    view: "analysis",
  });
  assert.equal(
    writeWorkspaceLocation(source, location),
    "/?trip=trip_1&view=analysis&campaign=friends#details",
  );
  const account = new URL(writeAccountSettingsLocation(source, true), source);
  assert.equal(withoutAccountSettingsLocation(account).href, source.href);
});

test("workspace URL state rejects invalid owned values", () => {
  assert.deepEqual(
    readWorkspaceLocation(
      new URL("https://otter.test/?trip=&view=unknown&mode=edit"),
    ),
    { expenseId: null, mode: null, tripId: null, view: "overview" },
  );
});

test("workspace URL writes preserve unknown parameters", () => {
  const result = writeWorkspaceLocation(
    new URL("https://otter.test/?campaign=friends&view=overview"),
    { expenseId: null, mode: "add-expense", tripId: "trip_2", view: "people" },
  );
  assert.equal(
    result,
    "/?campaign=friends&view=people&trip=trip_2&mode=add-expense",
  );
});

test("workspace URL removes absent owned values without touching the path", () => {
  const result = writeWorkspaceLocation(
    new URL("https://otter.test/gateway?trip=old&mode=add-expense&keep=1"),
    { expenseId: null, mode: null, tripId: null, view: "overview" },
  );
  assert.equal(result, "/gateway?keep=1");
});

test("edit expense URL state survives round trips and account settings", () => {
  const source = new URL(
    "https://otter.test/gateway?trip=trip_1&view=expenses&mode=edit-expense&expense=expense_1&keep=1&keep=2#details",
  );
  const location: WorkspaceLocation = {
    expenseId: "expense_1",
    mode: "edit-expense",
    tripId: "trip_1",
    view: "expenses",
  };
  assert.deepEqual(readWorkspaceLocation(source), location);
  assert.equal(
    writeWorkspaceLocation(source, location),
    `${source.pathname}${source.search}${source.hash}`,
  );
  const account = new URL(writeAccountSettingsLocation(source, true), source);
  assert.deepEqual(readWorkspaceLocation(account), location);
  assert.equal(withoutAccountSettingsLocation(account).href, source.href);
});

test.each(["", "&expense="])(
  "edit expense URL without an ID stays in edit mode: %s",
  (expense) => {
    const source = new URL(
      `https://otter.test/?trip=trip_1&mode=edit-expense${expense}`,
    );
    const location = readWorkspaceLocation(source);
    assert.deepEqual(location, {
      expenseId: null,
      mode: "edit-expense",
      tripId: "trip_1",
      view: "expenses",
    });
    assert.equal(
      writeWorkspaceLocation(source, location),
      "/?trip=trip_1&mode=edit-expense&view=expenses",
    );
  },
);

test.each(["", "overview", "people", "analysis", "unknown"])(
  "edit expense normalizes an incompatible view: %s",
  (view) => {
    const source = new URL(
      `https://otter.test/?trip=trip_1&view=${view}&mode=edit-expense&expense=expense_1`,
    );
    assert.equal(readWorkspaceLocation(source).view, "expenses");
    const location: WorkspaceLocation = {
      expenseId: "expense_1",
      mode: "edit-expense",
      tripId: "trip_1",
      view: "people",
    };
    assert.equal(
      new URL(
        writeWorkspaceLocation(source, location),
        source,
      ).searchParams.get("view"),
      "expenses",
    );
  },
);

test.each(["", "add-expense", "edit", "unknown"])(
  "expense IDs are ignored and removed outside edit mode: %s",
  (mode) => {
    const source = new URL(
      `https://otter.test/gateway?trip=trip_1&view=expenses&mode=${mode}&expense=old&expense=older&keep=1#details`,
    );
    const location = readWorkspaceLocation(source);
    assert.equal(location.expenseId, null);
    const written = new URL(
      writeWorkspaceLocation(source, { ...location, expenseId: "stale" }),
      source,
    );
    assert.equal(written.searchParams.has("expense"), false);
    assert.equal(written.searchParams.get("keep"), "1");
    assert.equal(written.pathname, "/gateway");
    assert.equal(written.hash, "#details");
  },
);

test("writing a new trip list clears the previous trip's edit parameters", () => {
  const source = new URL(
    "https://otter.test/?trip=old&view=expenses&mode=edit-expense&expense=old_expense&keep=1",
  );
  assert.equal(
    writeWorkspaceLocation(source, {
      expenseId: null,
      mode: null,
      tripId: "new",
      view: "expenses",
    }),
    "/?trip=new&view=expenses&keep=1",
  );
});

test("edit expense IDs are encoded without changing unrelated URL state", () => {
  const source = new URL("https://otter.test/gateway?keep=1#details");
  const location: WorkspaceLocation = {
    expenseId: "expense /?&#+東京",
    mode: "edit-expense",
    tripId: "trip_1",
    view: "expenses",
  };
  const written = new URL(writeWorkspaceLocation(source, location), source);
  assert.deepEqual(readWorkspaceLocation(written), location);
  assert.equal(written.searchParams.get("keep"), "1");
  assert.equal(written.pathname, "/gateway");
  assert.equal(written.hash, "#details");
});

test("workspace location equality compares every owned field", () => {
  const location: WorkspaceLocation = {
    expenseId: "expense_1",
    mode: "edit-expense",
    tripId: "trip_1",
    view: "expenses",
  };
  assert.equal(isSameWorkspaceLocation(location, { ...location }), true);
  const changes: Partial<WorkspaceLocation>[] = [
    { expenseId: "expense_2" },
    { expenseId: null },
    { mode: "add-expense" },
    { mode: null },
    { tripId: "trip_2" },
    { tripId: null },
    { view: "overview" },
  ];
  for (const change of changes) {
    assert.equal(
      isSameWorkspaceLocation(location, { ...location, ...change }),
      false,
    );
  }
});
