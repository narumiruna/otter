import { expect, test, vi } from "vitest";
import {
  errorPayload,
  executeCliCommand,
  parseCliCommand,
} from "../src/index.js";

const env = {
  OTTER_URL: "http://localhost:17463",
  OTTER_TOKEN: "otter_api_test",
};
for (const action of ["update", "delete"]) {
  const args = [
    "expenses",
    action,
    "--trip",
    "t",
    "--expense",
    "e",
    ...(action === "delete" ? ["--yes"] : ["--description", "Changed"]),
  ];
  test(`${action} requires an explicit positive version before any request`, () => {
    expect(() => parseCliCommand(args)).toThrow("--version");
    for (const value of ["0", "-1", "1.2", "01", "NaN", "9007199254740992"])
      expect(() => parseCliCommand([...args, "--version", value])).toThrow(
        "--version",
      );
    expect(parseCliCommand([...args, "--version", "3"]).headers).toEqual({
      "If-Match": '"3"',
    });
  });
  test(`${action} sends only the observed version and does not retry a conflict`, async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { error: "Changed", code: "EXPENSE_VERSION_CONFLICT" },
          { status: 412 },
        ),
      );
    const command = parseCliCommand([...args, "--version", "3"]);
    const error = await executeCliCommand(command, env, fetcher).catch(
      (caught: unknown) => caught,
    );
    expect(errorPayload(error)).toEqual({
      error: {
        code: "EXPENSE_VERSION_CONFLICT",
        message: "Changed",
        status: 412,
      },
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][1]?.headers).toMatchObject({
      "If-Match": '"3"',
      Authorization: "Bearer otter_api_test",
    });
  });
}
test("a version does not replace delete confirmation", () => {
  expect(() =>
    parseCliCommand([
      "expenses",
      "delete",
      "--trip",
      "t",
      "--expense",
      "e",
      "--version",
      "3",
    ]),
  ).toThrowError(expect.objectContaining({ code: "CONFIRMATION_REQUIRED" }));
});
