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
  const login = useForm<LoginCredentials>({
    defaultValues: devLoginCredentials ?? { email: "", password: "" },
  });
  const register = useForm<RegisterCredentials>({
    defaultValues: { email: "", name: "", password: "" },
  });
  const loginBusy = busyAction === "login";
  const registerBusy = busyAction === "register";

  return (
    <section className="grid gap-4 lg:grid-cols-[1.15fr_1fr_1fr]">
      <Card className="border-emerald-900/10 bg-emerald-950 text-white">
        <CardHeader>
          <CardDescription className="font-semibold tracking-[0.12em] text-emerald-200 uppercase">
            旅行拆帳，不靠腦補
          </CardDescription>
          <CardTitle className="text-2xl leading-tight text-white sm:text-3xl">
            把支出、餘額和結清建議放在同一個工作區。
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-emerald-50">
            <li>先建支出群組，再邀成員一起分帳。</li>
            <li>記錄付款人、貨幣與分帳對象。</li>
            <li>即時查看誰應收、誰應付。</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登入</CardTitle>
          <CardDescription>使用註冊時設定的帳號繼續。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="login-form"
            noValidate
            onSubmit={(event) => {
              void login.handleSubmit(onLogin)(event);
            }}
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
                  {...login.register("email", {
                    required: "請輸入 Email",
                  })}
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
                  {...login.register("password", {
                    required: "請輸入密碼",
                  })}
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
                disabled={loginBusy}
                type="submit"
              >
                {loginBusy ? "登入中…" : "登入"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>註冊</CardTitle>
          <CardDescription>建立帳號後即可新增支出群組。</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="register-form"
            noValidate
            onSubmit={(event) => {
              void register.handleSubmit(onRegister)(event);
            }}
          >
            <FieldGroup>
              {registerError ? <FieldError>{registerError}</FieldError> : null}
              <Field data-invalid={Boolean(register.formState.errors.name)}>
                <FieldLabel htmlFor="register-name">名稱</FieldLabel>
                <Input
                  id="register-name"
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={Boolean(register.formState.errors.name)}
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
                  aria-invalid={Boolean(register.formState.errors.email)}
                  {...register.register("email", {
                    required: "請輸入 Email",
                  })}
                />
                <FieldError errors={[register.formState.errors.email]} />
              </Field>
              <Field data-invalid={Boolean(register.formState.errors.password)}>
                <FieldLabel htmlFor="register-password">密碼</FieldLabel>
                <Input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={Boolean(register.formState.errors.password)}
                  {...register.register("password", {
                    minLength: { message: "密碼至少 8 個字", value: 8 },
                    required: "請輸入密碼",
                  })}
                />
                <FieldDescription>密碼至少 8 個字。</FieldDescription>
                <FieldError errors={[register.formState.errors.password]} />
              </Field>
              <Button
                className="min-h-11 w-full"
                disabled={registerBusy}
                type="submit"
              >
                {registerBusy ? "建立中…" : "建立帳號"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
