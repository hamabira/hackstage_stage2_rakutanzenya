import { AuthPage } from "@/components/auth/AuthPage";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <AuthPage
      action={login}
      alternateAction={{
        description: "アカウントをお持ちでない方は",
        href: "/signup",
        label: "新規登録",
      }}
      error={error}
      submitLabel="ログイン"
      title="ログイン"
    />
  );
}
