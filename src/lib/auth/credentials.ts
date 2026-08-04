export interface Credentials {
  email: string;
  password: string;
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
