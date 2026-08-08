export interface Credentials {
  email: string;
  password: string;
}

export const MIN_PASSWORD_LENGTH = 8;

/** 新規登録用パスワードが要件上の最低文字数を満たすか判定する。 */
export function isSignupPasswordValid(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export function getCredentials(formData: FormData): Credentials | null {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return null;
  }

  const normalizedEmail = email.trim();
  if (!normalizedEmail || !password) {
    return null;
  }

  return { email: normalizedEmail, password };
}
