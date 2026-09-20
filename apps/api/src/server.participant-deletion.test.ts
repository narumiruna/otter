import { expect, test } from "vitest";
import { createSession } from "./server-support.js";
import { api, postgresTestOptions, withTestApp } from "./server-test-utils.js";

const cases = [
  {
    name: "unused",
    count: 2,
    payer: false,
    split: false,
    payment: null,
    status: 200,
    error: undefined,
  },
  {
    name: "last",
    count: 1,
    payer: false,
    split: false,
    payment: null,
    status: 400,
    error: "至少需要一位參與者",
  },
  {
    name: "payer only",
    count: 2,
    payer: true,
    split: false,
    payment: null,
    status: 409,
    error: "參與者已有支出，不能刪除",
  },
  {
    name: "split only",
    count: 2,
    payer: false,
    split: true,
    payment: null,
    status: 409,
    error: "參與者已有支出，不能刪除",
  },
  {
    name: "payment sender",
    count: 2,
    payer: false,
    split: false,
    payment: "from",
    status: 409,
    error: "參與者已有付款紀錄，不能刪除",
  },
  {
    name: "payment recipient",
    count: 2,
    payer: false,
    split: false,
    payment: "to",
    status: 409,
    error: "參與者已有付款紀錄，不能刪除",
  },
  {
    name: "expense before payment",
    count: 2,
    payer: true,
    split: false,
    payment: "from",
    status: 409,
    error: "參與者已有支出，不能刪除",
  },
  {
    name: "last before expense",
    count: 1,
    payer: true,
    split: true,
    payment: null,
    status: 400,
    error: "至少需要一位參與者",
  },
] as const;

test.each(cases)(
  "participant deletion: $name",
  postgresTestOptions,
  async (scenario) => {
    const { baseUrl, pool } = await withTestApp();
    await pool.query(
      "INSERT INTO users (id, name, username, password_hash) VALUES ('user', 'Owner', 'owner', 'unused')",
    );
    const session = await createSession(pool, "user");
    await pool.query(
      "INSERT INTO trips (id, owner_id, name, base_currency) VALUES ('trip', 'user', 'Test', 'TWD')",
    );
    await pool.query(
      "INSERT INTO trip_members (id, trip_id, user_id, role) VALUES ('member', 'trip', 'user', 'owner')",
    );
    await pool.query(
      "INSERT INTO participants (id, trip_id, name) VALUES ('target', 'trip', 'Target')",
    );
    if (scenario.count > 1)
      await pool.query(
        "INSERT INTO participants (id, trip_id, name) VALUES ('other', 'trip', 'Other')",
      );
    if (scenario.payer || scenario.split) {
      await pool.query(
        "INSERT INTO expenses (id, trip_id, description, amount_minor, currency, paid_by_id, expense_date) VALUES ('expense', 'trip', 'Test', 100, 'TWD', $1, '2026-09-21')",
        [scenario.payer ? "target" : "other"],
      );
      await pool.query(
        "INSERT INTO expense_participants (expense_id, trip_id, participant_id, position) VALUES ('expense', 'trip', $1, 0)",
        [scenario.split ? "target" : "other"],
      );
    }
    if (scenario.payment)
      await pool.query(
        "INSERT INTO settlement_payments (id, trip_id, from_id, to_id, amount_minor, currency, paid_at, note) VALUES ('payment', 'trip', $1, $2, 10, 'TWD', '2026-09-21', '')",
        [
          scenario.payment === "from" ? "target" : "other",
          scenario.payment === "to" ? "target" : "other",
        ],
      );
    const result = await api<{ error?: string }>(
      baseUrl,
      "/api/trips/trip/participants/target",
      {
        headers: { cookie: `otter_session=${session.id}` },
        method: "DELETE",
      },
    );
    expect(result.response.status).toBe(scenario.status);
    expect(result.data.error).toBe(scenario.error);
    expect(
      (await pool.query("SELECT id FROM participants WHERE id = 'target'"))
        .rowCount,
    ).toBe(scenario.status === 200 ? 0 : 1);
  },
);
