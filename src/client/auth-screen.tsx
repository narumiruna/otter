import { CheckCircledIcon as CheckCircle2 } from "@radix-ui/react-icons";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export type LoginCredentials = { email: string; password: string };
export type RegisterCredentials = LoginCredentials & { name: string };

type AuthScreenProps = {
  devLoginCredentials?: LoginCredentials;
  loginError?: string;
  registerError?: string;
  busyAction?: string;
  onLogin: (credentials: LoginCredentials) => Promise<void> | void;
  onRegister: (credentials: RegisterCredentials) => Promise<void> | void;
};

export function AuthScreen({
  busyAction,
  devLoginCredentials,
  loginError,
  onLogin,
  onRegister,
  registerError,
}: AuthScreenProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const login = useForm<LoginCredentials>({
    defaultValues: devLoginCredentials ?? { email: "", password: "" },
  });
  const register = useForm<RegisterCredentials>({
    defaultValues: { email: "", name: "", password: "" },
  });
  return (
    <section className="auth-layout">
      <article className="auth-promise">
        <p className="eyebrow">旅行拆帳，不靠腦補</p>
        <h2>把支出、餘額和結清建議放在同一個清楚的工作區。</h2>
        <ul>
          {[
            "快速記錄共同支出",
            "即時看懂誰應收、誰應付",
            "用具體建議完成結清",
          ].map((item) => (
            <li key={item}>
              <CheckCircle2 aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </article>
      <Card className="auth-card">
        <CardHeader>
          <CardTitle>
            <h2>{mode === "login" ? "登入" : "建立帳號"}</h2>
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "使用既有帳號繼續管理群組。"
              : "建立帳號後即可新增第一個群組。"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "login" ? (
            <form
              id="login-form"
              noValidate
              onSubmit={(event) => void login.handleSubmit(onLogin)(event)}
            >
              <FieldGroup>
                {loginError ? <FieldError>{loginError}</FieldError> : null}
                <Field data-invalid={Boolean(login.formState.errors.email)}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(login.formState.errors.email)}
                    defaultValue={devLoginCredentials?.email}
                    {...login.register("email", { required: "請輸入 Email" })}
                  />
                  <FieldError errors={[login.formState.errors.email]} />
                </Field>
                <Field data-invalid={Boolean(login.formState.errors.password)}>
                  <FieldLabel htmlFor="login-password">密碼</FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(login.formState.errors.password)}
                    defaultValue={devLoginCredentials?.password}
                    {...login.register("password", { required: "請輸入密碼" })}
                  />
                  <FieldError errors={[login.formState.errors.password]} />
                </Field>
                {devLoginCredentials ? (
                  <FieldDescription>
                    開發環境測試帳號已預先填入。
                  </FieldDescription>
                ) : null}
                <Button
                  className="min-h-11 w-full"
                  disabled={busyAction === "login"}
                  type="submit"
                >
                  {busyAction === "login" ? "登入中…" : "登入"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  還沒有帳號？{" "}
                  <button
                    className="auth-switch"
                    type="button"
                    onClick={() => setMode("register")}
                  >
                    建立帳號
                  </button>
                </p>
              </FieldGroup>
            </form>
          ) : (
            <form
              id="register-form"
              noValidate
              onSubmit={(event) =>
                void register.handleSubmit(onRegister)(event)
              }
            >
              <FieldGroup>
                {registerError ? (
                  <FieldError>{registerError}</FieldError>
                ) : null}
                <Field data-invalid={Boolean(register.formState.errors.name)}>
                  <FieldLabel htmlFor="register-name">名稱</FieldLabel>
                  <Input
                    id="register-name"
                    autoComplete="name"
                    maxLength={80}
                    {...register.register("name", { required: "請輸入名稱" })}
                  />
                  <FieldError errors={[register.formState.errors.name]} />
                </Field>
                <Field data-invalid={Boolean(register.formState.errors.email)}>
                  <FieldLabel htmlFor="register-email">Email</FieldLabel>
                  <Input
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    {...register.register("email", {
                      required: "請輸入 Email",
                    })}
                  />
                  <FieldError errors={[register.formState.errors.email]} />
                </Field>
                <Field
                  data-invalid={Boolean(register.formState.errors.password)}
                >
                  <FieldLabel htmlFor="register-password">密碼</FieldLabel>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby="register-password-help"
                    {...register.register("password", {
                      minLength: { message: "密碼至少 8 個字", value: 8 },
                      required: "請輸入密碼",
                    })}
                  />
                  <FieldDescription id="register-password-help">
                    密碼至少 8 個字。
                  </FieldDescription>
                  <FieldError errors={[register.formState.errors.password]} />
                </Field>
                <Button
                  className="min-h-11 w-full"
                  disabled={busyAction === "register"}
                  type="submit"
                >
                  {busyAction === "register" ? "建立中…" : "建立帳號"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  已有帳號？{" "}
                  <button
                    className="auth-switch"
                    type="button"
                    onClick={() => setMode("login")}
                  >
                    返回登入
                  </button>
                </p>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
