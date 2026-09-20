import path from "node:path";
import { describe, expect, test } from "vitest";
import { migrationsDirectory } from "../scripts/migrate.js";
import { webAssetsRoot } from "./server.js";

describe("workspace runtime paths", () => {
  test("finds web assets independently of the working directory", () => {
    expect(webAssetsRoot({}, "/repo/apps/api/dist")).toBe(
      path.resolve("/repo/apps/web/dist"),
    );
    expect(
      webAssetsRoot(
        { OTTER_WEB_ROOT: "/srv/otter/web" },
        "/repo/apps/api/dist",
      ),
    ).toBe("/srv/otter/web");
  });

  test("finds source and compiled migrations beside their package output", () => {
    expect(migrationsDirectory("/repo/apps/api/scripts/migrate.ts")).toBe(
      path.resolve("/repo/apps/api/db/migrations"),
    );
    expect(migrationsDirectory("/repo/apps/api/dist/scripts/migrate.js")).toBe(
      path.resolve("/repo/apps/api/dist/db/migrations"),
    );
  });
});
