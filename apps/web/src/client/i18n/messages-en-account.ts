import { interpolate, type MessageValues } from "./message-types.js";

export const enAccount = {
  accountSettings: "Account settings",
  manageYourUsernameAndPasskeys:
    "Manage your appearance, language, username, passkeys, and API tokens.",
  appearance: "Appearance",
  chooseHowOtterLooksOnThisBrowser:
    "Choose how Otter looks. Changes apply immediately and are saved in this browser.",
  colorTheme: "Color theme",
  forestTheme: "Forest",
  oceanTheme: "Ocean",
  lavenderTheme: "Lavender",
  sunsetTheme: "Sunset",
  roseTheme: "Rose",
  displayMode: "Display mode",
  systemMode: "System",
  lightMode: "Light",
  darkMode: "Dark",
  useTheNewUsernameTheNextTimeYouSignInYourCurrentSessionWillContinue:
    "Use the new username the next time you sign in. Your current session will continue.",
  passkeys: "Passkeys",
  useAPasskeyToSignInWithoutYourPassword:
    "Use your device unlock to sign in without entering your password.",
  unableToLoadPasskeys: "Unable to load passkeys",
  unableToAddPasskey: "Unable to add a passkey. If you canceled, try again.",
  unableToRemovePasskey: "Unable to remove the passkey",
  passkeyAdded: "Passkey added",
  passkeyRemoved: "Passkey removed",
  passkeyNumber: (values: MessageValues) =>
    interpolate("Passkey {number}", values),
  addedOnDate: (values: MessageValues) => interpolate("Added {date}", values),
  removePasskeyNumber: (values: MessageValues) =>
    interpolate("Remove passkey {number}", values),
  noPasskeysAdded: "No passkeys added yet.",
  addingPasskey: "Adding passkey…",
  addPasskey: "Add passkey",
  thisBrowserDoesNotSupportPasskeys: "This browser does not support passkeys.",
  apiTokens: "API tokens",
  useApiTokensWithTheOtterCli:
    "Create Bearer tokens for the Otter CLI or automation tools.",
  loadingApiTokens: "Loading API tokens…",
  unableToLoadApiTokens: "Unable to load API tokens",
  unableToCreateApiToken: "Unable to create the API token",
  apiTokenCreationUncertain:
    "The token request outcome is unknown. Retry this request before creating another.",
  retryApiTokenCreation: "Retry token creation",
  unableToRevokeApiToken: "Unable to revoke the API token",
  unableToCopyApiToken: "Unable to copy the API token",
  apiTokenRevoked: "API token revoked",
  apiTokenCopied: "API token copied",
  enterATokenName: "Enter a token name",
  newApiToken: "New API token",
  copyYourApiTokenNow: "Copy your API token now",
  apiTokenShownOnce:
    "This token is shown only once. You cannot view it again after leaving.",
  copyToken: "Copy token",
  done: "Done",
  tokenName: "Token name",
  tokenNameExample: "For example: Travel automation",
  creatingApiToken: "Creating token…",
  createApiToken: "Create API token",
  apiTokenDates: (values: MessageValues) =>
    interpolate("Created {created} · Expires {expires}", values),
  revokeNamedApiToken: (values: MessageValues) =>
    interpolate('Revoke API token "{name}"', values),
  noActiveApiTokens: "No active API tokens.",
  apiTokensExpireAfter90Days:
    "Tokens expire after 90 days. To use one with the CLI, set it as",
};
