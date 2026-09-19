import {
  ArrowRightIcon,
  CheckCircledIcon as CheckCircle2,
  GlobeIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
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
import {
  isValidUsername,
  usernameValidationMessage,
} from "../shared/username.js";

export type LoginCredentials = { username: string; password: string };
export type RegisterCredentials = LoginCredentials;

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
    defaultValues: devLoginCredentials ?? { username: "", password: "" },
  });
  const register = useForm<RegisterCredentials>({
    defaultValues: { username: "", password: "" },
  });
  return (
    <section className="auth-layout">
      <article className="auth-promise">
        <p className="eyebrow">
          <GlobeIcon aria-hidden="true" /> 一起出發，輕鬆分帳
        </p>
        <h2>
          把時間留給旅途，
          <br />
          <span>把分帳交給 otter。</span>
        </h2>
        <p className="auth-description">
          從一頓晚餐到一趟旅行，記下每筆共同支出，讓朋友之間的帳目簡單、清楚。
        </p>
        <div
          className="auth-example"
          role="img"
          aria-label="分帳示意：週末小旅行，三人晚餐共 TWD 1,800，每人分攤 TWD 600。"
        >
          <div className="auth-example-heading">
            <span>
              <GlobeIcon aria-hidden="true" /> 週末小旅行
            </span>
            <span className="auth-example-label">分帳示意</span>
          </div>
          <div className="auth-example-total">
            <span>一起吃的晚餐</span>
            <strong>
              <small>TWD</small> 1,800
            </strong>
          </div>
          <div className="auth-example-split">
            <div className="example-avatars" aria-hidden="true">
              <span>你</span>
              <span>安</span>
              <span>宇</span>
            </div>
            <span>
              3 人均分 <ArrowRightIcon aria-hidden="true" /> 每人{" "}
              <strong>$600</strong>
            </span>
          </div>
        </div>
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
          <span className="auth-card-eyebrow" lang="en">
            {mode === "login" ? "WELCOME BACK" : "START A NEW JOURNEY"}
          </span>
          <CardTitle>
            <h2>{mode === "login" ? "登入" : "建立帳號"}</h2>
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? "歡迎回來，繼續你們的旅程。"
              : "從第一個群組，開始輕鬆分帳。"}
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
                <Field data-invalid={Boolean(login.formState.errors.username)}>
                  <FieldLabel htmlFor="login-username">Username</FieldLabel>
                  <Input
                    id="login-username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(login.formState.errors.username)}
                    defaultValue={devLoginCredentials?.username}
                    {...login.register("username", {
                      required: "請輸入 Username",
                    })}
                  />
                  <FieldError errors={[login.formState.errors.username]} />
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
                <Field
                  data-invalid={Boolean(register.formState.errors.username)}
                >
                  <FieldLabel htmlFor="register-username">Username</FieldLabel>
                  <Input
                    id="register-username"
                    type="text"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-invalid={Boolean(register.formState.errors.username)}
                    aria-describedby="register-username-help"
                    {...register.register("username", {
                      required: "請輸入 Username",
                      validate: (value) =>
                        isValidUsername(value) || usernameValidationMessage,
                    })}
                  />
                  <FieldDescription id="register-username-help">
                    {usernameValidationMessage}，不分大小寫。
                  </FieldDescription>
                  <FieldError errors={[register.formState.errors.username]} />
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
          <p className="auth-note">
            <LockClosedIcon aria-hidden="true" />{" "}
            分帳成員不需帳號，也能一起記在群組裡。
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
