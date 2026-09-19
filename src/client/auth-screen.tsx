import {
  ArrowRightIcon,
  CheckCircledIcon as CheckCircle2,
  GlobeIcon,
  LockClosedIcon,
} from "@radix-ui/react-icons";
import { useEffect, useRef, useState } from "react";
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
import { isValidUsername } from "../shared/username.js";
import { useI18n } from "./i18n.js";

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
  const { locale, messages } = useI18n();
  const [mode, setMode] = useState<"login" | "register">("login");
  const login = useForm<LoginCredentials>({
    defaultValues: devLoginCredentials ?? { username: "", password: "" },
  });
  const register = useForm<RegisterCredentials>({
    defaultValues: { username: "", password: "" },
  });
  const previousLocale = useRef(locale);

  useEffect(() => {
    if (previousLocale.current === locale) return;
    previousLocale.current = locale;
    login.clearErrors();
    register.clearErrors();
  }, [locale, login.clearErrors, register.clearErrors]);

  return (
    <section className="auth-layout">
      <article className="auth-promise">
        <p className="eyebrow">
          <GlobeIcon aria-hidden="true" />{" "}
          {messages.travelTogetherSplitWithEase}
        </p>
        <h2>
          {messages.spendYourTimeOnTheJourney}
          <br />
          <span>{messages.andLeaveTheSplittingToOtter}</span>
        </h2>
        <p className="auth-description">
          {
            messages.fromDinnerToAFullTripRecordEverySharedExpenseAndKeepGroupFinancesSimpleAndClear
          }
        </p>
        <div
          className="auth-example"
          role="img"
          aria-label={
            messages.splitExampleAWeekendTripDinnerCostsTwd1800ForThreePeopleOrTwd600Each
          }
        >
          <div className="auth-example-heading">
            <span>
              <GlobeIcon aria-hidden="true" /> {messages.weekendTrip}
            </span>
            <span className="auth-example-label">{messages.splitExample}</span>
          </div>
          <div className="auth-example-total">
            <span>{messages.dinnerTogether}</span>
            <strong>
              <small>TWD</small> 1,800
            </strong>
          </div>
          <div className="auth-example-split">
            <div className="example-avatars" aria-hidden="true">
              <span>{messages.you}</span>
              <span>{messages.a}</span>
              <span>{messages.y}</span>
            </div>
            <span>
              {messages.splitEquallyAmong3}{" "}
              <ArrowRightIcon aria-hidden="true" /> {messages.each}{" "}
              <strong>$600</strong>
            </span>
          </div>
        </div>
        <ul>
          {[
            messages.quicklyRecordSharedExpenses,
            messages.seeWhoOwesAndWhoIsOwedAtAGlance,
            messages.settleUpWithClearSuggestions,
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
            <h2>
              {mode === "login" ? messages.signIn : messages.createAccount}
            </h2>
          </CardTitle>
          <CardDescription>
            {mode === "login"
              ? messages.welcomeBackContinueYourJourney
              : messages.createYourFirstGroupAndStartSplittingWithEase}
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
                      required: messages.enterAUsername,
                    })}
                  />
                  <FieldError errors={[login.formState.errors.username]} />
                </Field>
                <Field data-invalid={Boolean(login.formState.errors.password)}>
                  <FieldLabel htmlFor="login-password">
                    {messages.password}
                  </FieldLabel>
                  <Input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={Boolean(login.formState.errors.password)}
                    defaultValue={devLoginCredentials?.password}
                    {...login.register("password", {
                      required: messages.enterAPassword,
                    })}
                  />
                  <FieldError errors={[login.formState.errors.password]} />
                </Field>
                {devLoginCredentials ? (
                  <FieldDescription>
                    {messages.developmentCredentialsHaveBeenFilledIn}
                  </FieldDescription>
                ) : null}
                <Button
                  className="min-h-11 w-full"
                  disabled={busyAction === "login"}
                  type="submit"
                >
                  {busyAction === "login"
                    ? messages.signingIn
                    : messages.signIn}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {messages.needAnAccount}{" "}
                  <button
                    className="auth-switch"
                    type="button"
                    onClick={() => setMode("register")}
                  >
                    {messages.createAccount}
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
                      required: messages.enterAUsername,
                      validate: (value) =>
                        isValidUsername(value) ||
                        messages.usernameMustBe332LettersNumbersUnderscoresOrHyphens,
                    })}
                  />
                  <FieldDescription id="register-username-help">
                    {
                      messages.usernameMustBe332LettersNumbersUnderscoresOrHyphens
                    }{" "}
                    {messages.usernameIsNotCaseSensitive}
                  </FieldDescription>
                  <FieldError errors={[register.formState.errors.username]} />
                </Field>
                <Field
                  data-invalid={Boolean(register.formState.errors.password)}
                >
                  <FieldLabel htmlFor="register-password">
                    {messages.password}
                  </FieldLabel>
                  <Input
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    aria-describedby="register-password-help"
                    {...register.register("password", {
                      minLength: {
                        message: messages.passwordMustBeAtLeast8Characters,
                        value: 8,
                      },
                      required: messages.enterAPassword,
                    })}
                  />
                  <FieldDescription id="register-password-help">
                    {messages.passwordMustBeAtLeast8Characters2}
                  </FieldDescription>
                  <FieldError errors={[register.formState.errors.password]} />
                </Field>
                <Button
                  className="min-h-11 w-full"
                  disabled={busyAction === "register"}
                  type="submit"
                >
                  {busyAction === "register"
                    ? messages.creating
                    : messages.createAccount}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  {messages.alreadyHaveAnAccount}{" "}
                  <button
                    className="auth-switch"
                    type="button"
                    onClick={() => setMode("login")}
                  >
                    {messages.backToSignIn}
                  </button>
                </p>
              </FieldGroup>
            </form>
          )}
          <p className="auth-note">
            <LockClosedIcon aria-hidden="true" />{" "}
            {messages.expenseParticipantsDoNotNeedAccountsToBeIncludedInAGroup}
          </p>
        </CardContent>
      </Card>
    </section>
  );
}
