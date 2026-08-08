import { AuthPage } from "@/components/auth/AuthPage";
import {
  LOGIN_REDIRECT_MESSAGES,
  toLoginRedirectReason,
} from "@/lib/auth/authMessages";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reason?: string }>;
}) {
  const { error, reason } = await searchParams;

  // ページ保護から戻された理由は、想定内の値だけを文言へ変換する。
  // クエリ文字列の内容をそのまま表示しないため、任意の文字列は差し込めない。
  const redirectReason = toLoginRedirectReason(reason);
  const message =
    error ?? (redirectReason === null ? undefined : LOGIN_REDIRECT_MESSAGES[redirectReason]);

  return (
    <AuthPage
      action={login}
      alternateAction={{
        description: "アカウントをお持ちでない方は",
        href: "/signup",
        label: "新規登録",
      }}
      error={message}
      submitLabel="ログイン"
      title="ログイン"
    />
  );
}
