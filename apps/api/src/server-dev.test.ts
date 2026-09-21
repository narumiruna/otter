import assert from "node:assert/strict";
import { test } from "vitest";
import {
  developmentAdminCredentials,
  ensureDevelopmentAdmin,
  ensureDevelopmentFixtures,
} from "./server-dev.js";
import {
  api,
  postgresTestOptions,
  type TripPayload,
  type TripsResponse,
  type UserResponse,
  withTestApp,
} from "./server-test-utils.js";

const credentials = {
  username: "admin",
  name: "Admin",
  password: "admin1234",
};

test("development admin credentials are enabled only in development", () => {
  assert.deepEqual(
    developmentAdminCredentials({
      DEV_ADMIN_PASSWORD: credentials.password,
      NODE_ENV: "development",
    }),
    credentials,
  );
  assert.equal(
    developmentAdminCredentials({
      DEV_ADMIN_PASSWORD: credentials.password,
      NODE_ENV: "production",
    }),
    null,
  );
});

test("development admin credentials reject incomplete configuration", () => {
  assert.throws(
    () => developmentAdminCredentials({ NODE_ENV: "development" }),
    /DEV_ADMIN_PASSWORD/,
  );
});

test(
  "development admin is seeded, exposed for prefilling, and can log in",
  postgresTestOptions,
  async () => {
    const { baseUrl } = await withTestApp({
      appOptions: { devLoginCredentials: credentials },
      prepare: async (pool) => {
        const userId = await ensureDevelopmentAdmin(pool, credentials);
        await ensureDevelopmentFixtures(pool, userId);
        const before = (
          await pool.query("SELECT * FROM expense_revisions ORDER BY id")
        ).rows;
        assert.ok(before.length > 0);
        assert.ok(
          before.every(
            (row) => row.version === 1 && row.source === "development_seed",
          ),
        );
        await Promise.all([
          ensureDevelopmentFixtures(pool, userId),
          ensureDevelopmentFixtures(pool, userId),
        ]);
        assert.deepEqual(
          (await pool.query("SELECT * FROM expense_revisions ORDER BY id"))
            .rows,
          before,
        );
      },
    });

    const config = await api<{
      devLoginCredentials: { username: string; password: string } | null;
    }>(baseUrl, "/api/config");
    assert.equal(config.response.status, 200);
    assert.deepEqual(config.data.devLoginCredentials, {
      username: credentials.username,
      password: credentials.password,
    });

    const login = await api<UserResponse>(baseUrl, "/api/auth/login", {
      body: JSON.stringify({
        username: credentials.username,
        password: credentials.password,
      }),
      method: "POST",
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.data.user?.name, "Admin");
    const cookie = login.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);

    const rename = await api<{ error: string }>(baseUrl, "/api/me", {
      body: JSON.stringify({ username: "renamed-admin" }),
      headers: { cookie },
      method: "PATCH",
    });
    assert.equal(rename.response.status, 409);
    assert.equal(rename.data.error, "開發環境預設帳號不能修改 Username");
    const me = await api<UserResponse>(baseUrl, "/api/me", {
      headers: { cookie },
    });
    assert.equal(me.data.user?.username, credentials.username);

    const trips = await api<TripsResponse>(baseUrl, "/api/trips", {
      headers: { cookie },
    });
    assert.equal(trips.data.trips.length, 3);
    assert.equal(trips.data.archivedTrips.length, 1);
    const tokyoSummary = trips.data.trips.find(
      ({ name }) => name === "東京賞櫻五日",
    );
    assert.equal(tokyoSummary?.participantCount, 4);
    assert.equal(tokyoSummary?.expenseCount, 8);

    assert.ok(tokyoSummary);
    const tokyo = await api<TripPayload>(
      baseUrl,
      `/api/trips/${tokyoSummary.id}`,
      { headers: { cookie } },
    );
    assert.equal(tokyo.data.trip.expenses.length, 8);
    assert.ok(
      tokyo.data.trip.expenses.some(
        ({ category, currency, description, tags }) =>
          description === "築地海鮮丼" &&
          category === "餐飲" &&
          currency === "JPY" &&
          tags.includes("必吃"),
      ),
    );
    assert.ok(
      tokyo.data.trip.expenses.some(
        ({ participantShares }) => participantShares?.length === 4,
      ),
    );
    assert.equal(tokyo.data.trip.settlementPayments?.length, 1);
  },
);
