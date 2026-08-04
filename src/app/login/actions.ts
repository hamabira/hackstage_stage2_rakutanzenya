"use server";

import { redirect } from "next/navigation";
import { getCredentials } from "@/lib/auth/credentials";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const credentials = getCredentials(formData);
  if (!credentials) {
    redirect(
      `/login?error=${encodeURIComponent("メールアドレスとパスワードを入力してください")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error || !data.session) {
    redirect(
      `/login?error=${encodeURIComponent("メールアドレスまたはパスワードを確認してください")}`,
    );
  }

  redirect("/dashboard");
}
