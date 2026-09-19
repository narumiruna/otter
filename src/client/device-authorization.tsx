import { CheckCircledIcon, DesktopIcon } from "@radix-ui/react-icons";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api } from "./client-support.js";
import { useI18n } from "./i18n.js";

type DeviceRequest = {
  clientName: string;
  expiresAt: string;
  userCode: string;
};

export function DeviceAuthorization({ initialCode }: { initialCode: string }) {
  const { messages } = useI18n();
  const [code, setCode] = useState(initialCode);
  const [request, setRequest] = useState<DeviceRequest | null>(null);
  const [status, setStatus] = useState<
    "idle" | "checking" | "approving" | "approved"
  >("idle");
  const [error, setError] = useState("");

  const inspect = useCallback(
    async (value: string) => {
      const normalized = value.trim().toUpperCase();
      if (normalized.replace(/[^A-Z2-9]/g, "").length !== 8) {
        setError(messages.enterAValidDeviceCode);
        return;
      }
      setStatus("checking");
      setError("");
      try {
        const result = await api<DeviceRequest>(
          `/api/auth/device/${encodeURIComponent(normalized)}`,
        );
        setCode(result.userCode);
        setRequest(result);
        setStatus("idle");
      } catch (caught) {
        setRequest(null);
        setStatus("idle");
        setError(
          caught instanceof Error
            ? caught.message
            : messages.deviceCodeNotFoundOrExpired,
        );
      }
    },
    [messages],
  );

  useEffect(() => {
    if (initialCode) {
      void inspect(initialCode);
    }
  }, [initialCode, inspect]);

  async function approve() {
    if (!request) return;
    setStatus("approving");
    setError("");
    try {
      await api<{ ok: true }>("/api/auth/device/approve", {
        body: JSON.stringify({ userCode: request.userCode }),
        method: "POST",
      });
      setStatus("approved");
    } catch (caught) {
      setStatus("idle");
      setError(
        caught instanceof Error
          ? caught.message
          : messages.deviceCodeNotFoundOrExpired,
      );
    }
  }

  if (status === "approved") {
    return (
      <section className="auth-layout">
        <Card className="auth-card">
          <CardHeader>
            <CheckCircledIcon aria-hidden="true" width={32} height={32} />
            <CardTitle>
              <h2>{messages.cliAccessApproved}</h2>
            </CardTitle>
            <CardDescription>
              {messages.cliAccessApprovedDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </section>
    );
  }

  return (
    <section className="auth-layout">
      <Card className="auth-card">
        <CardHeader>
          <DesktopIcon aria-hidden="true" width={32} height={32} />
          <CardTitle>
            <h2>
              {request ? messages.cliAccessRequest : messages.authorizeCli}
            </h2>
          </CardTitle>
          <CardDescription>
            {request
              ? `${messages.cliAccessRequestedBy}: ${request.clientName}`
              : messages.authorizeCliDescription}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {request ? (
            <div className="space-y-4">
              <p>
                <strong>{messages.deviceCode}:</strong>{" "}
                <code>{request.userCode}</code>
              </p>
              {error ? <FieldError>{error}</FieldError> : null}
              <Button
                className="min-h-11 w-full"
                disabled={status === "approving"}
                onClick={() => void approve()}
              >
                {status === "approving"
                  ? messages.approvingCliAccess
                  : messages.approveCliAccess}
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void inspect(code);
              }}
            >
              <FieldGroup>
                {error ? <FieldError>{error}</FieldError> : null}
                <Field>
                  <FieldLabel htmlFor="device-code">
                    {messages.deviceCode}
                  </FieldLabel>
                  <Input
                    id="device-code"
                    autoCapitalize="characters"
                    autoComplete="one-time-code"
                    maxLength={9}
                    spellCheck={false}
                    value={code}
                    onChange={(event) =>
                      setCode(event.target.value.toUpperCase())
                    }
                  />
                </Field>
                <Button
                  className="min-h-11 w-full"
                  disabled={status === "checking"}
                  type="submit"
                >
                  {status === "checking"
                    ? messages.checkingDeviceCode
                    : messages.checkDeviceCode}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
