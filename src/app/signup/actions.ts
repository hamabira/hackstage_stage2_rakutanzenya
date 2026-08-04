"use server";

import { redirect } from "next/navigation";
import { getCredentials } from "@/lib/auth/credentials";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const credentials = getCredentials(formData);
  if (!credentials) {
    redirect(
      `/signup?error=${encodeURIComponent("メールアドレスとパスワードを入力してください")}`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);

  if (error || !data.session) {
    redirect(
      `/signup?error=${encodeURIComponent("登録に失敗しました。入力内容を確認してください")}`,
    );
  }

  redirect("/dashboard");
}
