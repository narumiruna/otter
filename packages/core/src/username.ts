const usernamePattern = /^[a-zA-Z0-9_-]{3,32}$/;
export const usernameValidationMessage =
  "Username 需為 3–32 個英文字母、數字、底線或連字號";

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string): boolean {
  return usernamePattern.test(username.trim());
}
