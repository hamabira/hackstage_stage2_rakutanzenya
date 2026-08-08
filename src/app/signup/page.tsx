import { AuthPage } from "@/components/auth/AuthPage";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/credentials";
import { signup } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthPage
      action={signup}
      alternateAction={{
        description: "アカウントをお持ちの方は",
        href: "/login",
        label: "ログイン",
      }}
      error={error}
      passwordMinLength={MIN_PASSWORD_LENGTH}
      submitLabel="登録する"
      title="新規登録"
    />
  );
}
