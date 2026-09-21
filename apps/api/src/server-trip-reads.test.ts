import { setImmediate } from "node:timers/promises";
import { expect, test, vi } from "vitest";
import { loadTripForUser } from "./server-support.js";
import { postgresTestOptions, withTestApp } from "./server-test-utils.js";

for (const mode of ["pool", "client"] as const) {
  test(`trip reads run ${mode === "pool" ? "in parallel on a pool" : "sequentially on a transaction client"}`, {
    ...postgresTestOptions,
    timeout: 10_000,
  }, async () => {
    const { pool } = await withTestApp({
      prepare: async (pool) => {
        await pool.query(`
          INSERT INTO users (id,name,username,password_hash) VALUES ('u','User','user','unused');
          INSERT INTO trips (id,owner_id,name,base_currency) VALUES ('t','u','Trip','TWD');
          INSERT INTO trip_members (id,trip_id,user_id,role) VALUES ('m','t','u','owner');
          INSERT INTO participants (id,trip_id,name) VALUES ('p','t','User');
        `);
      },
    });
    const blocker = await pool.connect();
    const db = mode === "pool" ? pool : await pool.connect();
    const query = vi.spyOn(db, "query");
    let pending: ReturnType<typeof loadTripForUser> | undefined;
    try {
      await blocker.query("BEGIN");
      // Hold the first detail query behind a real DB barrier. No elapsed-time
      // comparison: later queries must already be queued only for the Pool.
      await blocker.query("LOCK TABLE participants IN ACCESS EXCLUSIVE MODE");
      pending = loadTripForUser(db, "u", "t");
      for (const deadline = Date.now() + 5_000; Date.now() < deadline; ) {
        if (
          query.mock.calls.some(([sql]) =>
            String(sql).includes("FROM participants"),
          )
        )
          break;
        await setImmediate();
      }
      const selects = query.mock.calls
        .map(([sql]) => String(sql))
        .filter((sql) => sql.trimStart().startsWith("SELECT"));
      expect(
        selects.some((sql) => sql.includes("FROM participants")),
        JSON.stringify(selects),
      ).toBe(true);
      expect(selects).toHaveLength(mode === "pool" ? 7 : 2);
    } finally {
      await blocker.query("ROLLBACK");
      blocker.release();
      try {
        if (pending)
          expect((await pending)?.participants).toEqual([
            { id: "p", name: "User" },
          ]);
      } finally {
        query.mockRestore();
        if ("release" in db) db.release();
      }
    }
  });
}
