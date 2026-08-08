"use server";

import { redirect } from "next/navigation";
import {
  SIGNUP_MESSAGES,
  resolveSignupOutcome,
} from "@/lib/auth/authMessages";
import {
  getCredentials,
  isSignupPasswordValid,
} from "@/lib/auth/credentials";
import { createClient } from "@/lib/supabase/server";

function redirectWithMessage(message: string): never {
  redirect(`/signup?error=${encodeURIComponent(message)}`);
}

export async function signup(formData: FormData) {
  const credentials = getCredentials(formData);
  if (!credentials) {
    redirectWithMessage("メールアドレスとパスワードを入力してください");
  }

  if (!isSignupPasswordValid(credentials.password)) {
    redirectWithMessage(SIGNUP_MESSAGES.invalid_credentials);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);

  const outcome = resolveSignupOutcome({
    error,
    hasSession: Boolean(data.session),
    hasUser: Boolean(data.user),
    identitiesCount: data.user?.identities?.length ?? null,
  });

  if (outcome !== "created") {
    // Confirm email が有効な環境では登録自体は成功しているため、
    // 「失敗しました」ではなく次に取るべき行動を案内する。
    redirectWithMessage(SIGNUP_MESSAGES[outcome]);
  }

  redirect("/dashboard");
}
