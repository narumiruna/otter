import { mkdir, mkdtemp, readFile, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { CliError } from "../skills/otter-manage-expenses/scripts/otter-cli.js";
import {
  errorPayload,
  executeCliCommand,
  executeDeviceLogin,
  executeDeviceLogout,
  parseCliCommand,
  parseDeviceLoginArguments,
} from "../skills/otter-manage-expenses/scripts/otter-cli.js";

const environment = {
  OTTER_PASSWORD: "correct horse battery staple",
  OTTER_URL: "http://localhost:17463",
  OTTER_USERNAME: "agent",
};

describe("parseCliCommand", () => {
  test("builds an equal-split expense request", () => {
    expect(
      parseCliCommand([
        "expenses",
        "add",
        "--trip",
        "trip/1",
        "--description",
        "Dinner",
        "--amount",
        "1200",
        "--currency",
        "TWD",
        "--paid-by",
        "participant-a",
        "--split-with",
        "participant-a, participant-b,participant-a",
        "--tags",
        "food,night",
      ]),
    ).toEqual({
      body: {
        amount: "1200",
        currency: "TWD",
        description: "Dinner",
        paidById: "participant-a",
        participantIds: ["participant-a", "participant-b"],
        tags: ["food", "night"],
      },
      method: "POST",
      path: "/api/trips/trip%2F1/expenses",
    });
  });

  test("sets equal split mode when updating split participants", () => {
    expect(
      parseCliCommand([
        "expenses",
        "update",
        "--trip",
        "trip-1",
        "--expense",
        "expense-1",
        "--split-with",
        "participant-a,participant-b",
      ]).body,
    ).toEqual({
      participantIds: ["participant-a", "participant-b"],
      splitMode: "equal",
    });
  });

  test("allows clearing expense tags", () => {
    expect(
      parseCliCommand([
        "expenses",
        "update",
        "--trip",
        "trip-1",
        "--expense",
        "expense-1",
        "--tags",
        "",
      ]).body,
    ).toEqual({ tags: [] });
  });

  test("requires explicit confirmation for deletion", () => {
    expect(() =>
      parseCliCommand([
        "expenses",
        "delete",
        "--trip",
        "trip-1",
        "--expense",
        "expense-1",
      ]),
    ).toThrowError(expect.objectContaining({ code: "CONFIRMATION_REQUIRED" }));
  });

  test("parses device login options", () => {
    expect(
      parseDeviceLoginArguments([
        "--client-name",
        "Expense agent",
        "--no-open",
      ]),
    ).toEqual({ clientName: "Expense agent", noOpen: true });
  });

  test("requires an authenticated user for auth status", () => {
    expect(parseCliCommand(["auth", "status"])).toEqual({
      authenticatedUserRequired: true,
      method: "GET",
      path: "/api/me",
    });
  });

  test("does not expose destructive base-currency updates", () => {
    expect(() =>
      parseCliCommand([
        "trips",
        "update",
        "--trip",
        "trip-1",
        "--currency",
        "USD",
      ]),
    ).toThrowError(expect.objectContaining({ code: "USAGE" }));
  });

  test("rejects unknown options", () => {
    expect(() =>
      parseCliCommand(["trips", "list", "--format", "table"]),
    ).toThrowError(expect.objectContaining({ code: "USAGE" }));
  });
});

describe("executeCliCommand", () => {
  test("does not fall back to password authentication", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      executeCliCommand(
        {
          method: "GET",
          path: "/api/trips/trip-1",
          select: "balances",
        },
        environment,
        fetchMock,
      ),
    ).rejects.toEqual(
      expect.objectContaining<CliError>({ code: "CONFIG_ERROR" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("returns server errors without exposing tokens", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "API token is invalid" }), {
        status: 401,
      }),
    );
    const token = "otter_api_do_not_expose";

    let caught: unknown;
    try {
      await executeCliCommand(
        { method: "GET", path: "/api/me" },
        { OTTER_TOKEN: token, OTTER_URL: environment.OTTER_URL },
        fetchMock,
      );
    } catch (error) {
      caught = error;
    }

    expect(errorPayload(caught)).toEqual({
      error: {
        code: "API_ERROR",
        message: "API token is invalid",
        status: 401,
      },
    });
    expect(JSON.stringify(errorPayload(caught))).not.toContain(token);
  });

  test("uses a Bearer token without a password login", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "user-1" } })),
      );

    await executeCliCommand(
      { method: "GET", path: "/api/me" },
      {
        OTTER_TOKEN: "otter_api_ephemeral",
        OTTER_URL: "http://localhost:17463",
      },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer otter_api_ephemeral",
        }),
      }),
    );
  });

  test("reports a null auth-status user as an authentication error", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ user: null })));

    await expect(
      executeCliCommand(
        parseCliCommand(["auth", "status"]),
        {
          OTTER_TOKEN: "otter_api_expired",
          OTTER_URL: "http://localhost:17463",
        },
        fetchMock,
      ),
    ).rejects.toEqual(
      expect.objectContaining<CliError>({ code: "AUTH_ERROR" }),
    );
  });

  test("refuses credentials over remote HTTP by default", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      executeCliCommand(
        { method: "GET", path: "/api/me" },
        { ...environment, OTTER_URL: "http://otter.example.test" },
        fetchMock,
      ),
    ).rejects.toEqual(
      expect.objectContaining<CliError>({ code: "INSECURE_HTTP" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("allows credentials over IPv6 loopback HTTP", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify({ user: null })));

    await executeCliCommand(
      { method: "GET", path: "/api/me" },
      {
        OTTER_TOKEN: "otter_api_ephemeral",
        OTTER_URL: "http://[::1]:17463",
      },
      fetchMock,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://[::1]:17463/api/me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer otter_api_ephemeral",
        }),
      }),
    );
  });
});

describe("device login", () => {
  test("rejects login while an environment token would shadow it", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      executeDeviceLogin(
        {
          OTTER_TOKEN: "otter_api_ephemeral",
          OTTER_URL: "http://localhost:17463",
        },
        { fetchImplementation: fetchMock, noOpen: true },
      ),
    ).rejects.toEqual(
      expect.objectContaining<CliError>({ code: "CONFIG_ERROR" }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("revokes a new token when credential persistence fails", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "otter-cli-"));
    const configPath = path.join(directory, "credentials.json");
    const authorization = {
      device_code: "device-secret",
      expires_in: 600,
      interval: 3,
      user_code: "ABCD-2345",
      verification_uri: "http://localhost:17463/device",
      verification_uri_complete: "http://localhost:17463/device?code=ABCD-2345",
    };
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(authorization), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "otter_api_unpersisted",
            expires_at: "2099-01-01T00:00:00.000Z",
            token_type: "Bearer",
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));

    await expect(
      executeDeviceLogin(
        {
          OTTER_CONFIG_PATH: configPath,
          OTTER_URL: "http://localhost:17463",
        },
        {
          fetchImplementation: fetchMock,
          noOpen: true,
          sleep: async () => {
            await mkdir(configPath);
          },
        },
      ),
    ).rejects.toEqual(
      expect.objectContaining<CliError>({ code: "CONFIG_ERROR" }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "http://localhost:17463/api/auth/tokens/current",
    );
    expect(
      new Headers(fetchMock.mock.calls[2]?.[1]?.headers).get("Authorization"),
    ).toBe("Bearer otter_api_unpersisted");
  });

  test("polls for approval, stores a private token, uses it, and revokes it", async () => {
    const directory = await mkdtemp(path.join(tmpdir(), "otter-cli-"));
    const configPath = path.join(directory, "credentials.json");
    const deviceAuthorization = {
      device_code: "device-secret",
      expires_in: 600,
      interval: 3,
      user_code: "ABCD-2345",
      verification_uri: "http://localhost:17463/device",
      verification_uri_complete: "http://localhost:17463/device?code=ABCD-2345",
    };
    const loginFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(deviceAuthorization), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "authorization_pending" }), {
          status: 400,
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "otter_api_persisted",
            expires_at: "2099-01-01T00:00:00.000Z",
            token_type: "Bearer",
          }),
        ),
      );
    const openBrowser = vi.fn();
    const sleep = vi.fn().mockResolvedValue(undefined);
    const authEnvironment = {
      OTTER_CONFIG_PATH: configPath,
      OTTER_URL: "http://localhost:17463",
    };

    await expect(
      executeDeviceLogin(authEnvironment, {
        fetchImplementation: loginFetch,
        openBrowser,
        sleep,
      }),
    ).resolves.toEqual({
      authenticated: true,
      expiresAt: "2099-01-01T00:00:00.000Z",
      server: "http://localhost:17463",
    });
    expect(openBrowser).toHaveBeenCalledWith(
      deviceAuthorization.verification_uri_complete,
    );
    expect(sleep).toHaveBeenCalledTimes(2);
    expect((await stat(configPath)).mode & 0o777).toBe(0o600);
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {
        "http://localhost:17463": {
          accessToken: "otter_api_persisted",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      },
      version: 1,
    });

    const dataFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        new Response(JSON.stringify({ user: { id: "user-1" } })),
      );
    await executeCliCommand(
      { method: "GET", path: "/api/me" },
      authEnvironment,
      dataFetch,
    );
    expect(dataFetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer otter_api_persisted",
        }),
      }),
    );

    const failedRotationFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(deviceAuthorization), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "otter_api_unsaved_rotation",
            expires_at: "2099-02-01T00:00:00.000Z",
            token_type: "Bearer",
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Service unavailable" }), {
          status: 503,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await expect(
      executeDeviceLogin(authEnvironment, {
        fetchImplementation: failedRotationFetch,
        noOpen: true,
        sleep: vi.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toEqual(expect.objectContaining<CliError>({ code: "API_ERROR" }));
    expect(failedRotationFetch).toHaveBeenCalledTimes(4);
    expect(
      failedRotationFetch.mock.calls
        .slice(2)
        .map(([, options]) =>
          new Headers(options?.headers).get("Authorization"),
        ),
    ).toEqual([
      "Bearer otter_api_persisted",
      "Bearer otter_api_unsaved_rotation",
    ]);
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {
        "http://localhost:17463": {
          accessToken: "otter_api_persisted",
          expiresAt: "2099-01-01T00:00:00.000Z",
        },
      },
      version: 1,
    });

    const rotationFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(deviceAuthorization), { status: 201 }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            access_token: "otter_api_rotated",
            expires_at: "2099-02-01T00:00:00.000Z",
            token_type: "Bearer",
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await executeDeviceLogin(authEnvironment, {
      fetchImplementation: rotationFetch,
      noOpen: true,
      sleep: vi.fn().mockResolvedValue(undefined),
    });
    expect(rotationFetch.mock.calls[2]?.[0]).toBe(
      "http://localhost:17463/api/auth/tokens/current",
    );
    expect(rotationFetch.mock.calls[2]?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer otter_api_persisted",
        }),
        method: "DELETE",
      }),
    );
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {
        "http://localhost:17463": {
          accessToken: "otter_api_rotated",
          expiresAt: "2099-02-01T00:00:00.000Z",
        },
      },
      version: 1,
    });

    const failedLogoutFetch = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: "Service unavailable" }), {
        status: 503,
      }),
    );
    await expect(
      executeDeviceLogout(authEnvironment, failedLogoutFetch),
    ).rejects.toEqual(expect.objectContaining<CliError>({ code: "API_ERROR" }));
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {
        "http://localhost:17463": {
          accessToken: "otter_api_rotated",
          expiresAt: "2099-02-01T00:00:00.000Z",
        },
      },
      version: 1,
    });

    const dualTokenEnvironment = {
      ...authEnvironment,
      OTTER_TOKEN: "otter_api_ephemeral",
    };
    const partialLogoutFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Service unavailable" }), {
          status: 503,
        }),
      );
    await expect(
      executeDeviceLogout(dualTokenEnvironment, partialLogoutFetch),
    ).rejects.toEqual(expect.objectContaining<CliError>({ code: "API_ERROR" }));
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {
        "http://localhost:17463": {
          accessToken: "otter_api_rotated",
          expiresAt: "2099-02-01T00:00:00.000Z",
        },
      },
      version: 1,
    });

    const logoutFetch = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    await expect(
      executeDeviceLogout(dualTokenEnvironment, logoutFetch),
    ).resolves.toEqual({
      authenticated: false,
      server: "http://localhost:17463",
    });
    expect(logoutFetch).toHaveBeenCalledTimes(2);
    expect(
      logoutFetch.mock.calls.map(([, options]) =>
        new Headers(options?.headers).get("Authorization"),
      ),
    ).toEqual(["Bearer otter_api_ephemeral", "Bearer otter_api_rotated"]);
    expect(JSON.parse(await readFile(configPath, "utf8"))).toEqual({
      servers: {},
      version: 1,
    });
  });
});
