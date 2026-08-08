"use server";

import { redirect } from "next/navigation";
import { LOGIN_MESSAGES, resolveLoginOutcome } from "@/lib/auth/authMessages";
import { getCredentials } from "@/lib/auth/credentials";
import { createClient } from "@/lib/supabase/server";

function redirectWithMessage(message: string): never {
  redirect(`/login?error=${encodeURIComponent(message)}`);
}

export async function login(formData: FormData) {
  const credentials = getCredentials(formData);
  if (!credentials) {
    redirectWithMessage("メールアドレスとパスワードを入力してください");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  const outcome = resolveLoginOutcome({ error, hasSession: Boolean(data.session) });

  if (outcome !== "signed_in") {
    redirectWithMessage(LOGIN_MESSAGES[outcome]);
  }

  redirect("/dashboard");
}
