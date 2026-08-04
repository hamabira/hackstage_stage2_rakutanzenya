import Link from "next/link";
import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-16">
      <h1 className="text-xl font-semibold">ログイン</h1>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <form action={login} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          メールアドレス
          <input
            type="email"
            name="email"
            required
            className="rounded-md border px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          パスワード
          <input
            type="password"
            name="password"
            required
            className="rounded-md border px-3 py-2"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
        >
          ログイン
        </button>
      </form>

      <p className="text-sm text-gray-600">
        アカウントをお持ちでない方は{" "}
        <Link href="/signup" className="underline">
          新規登録
        </Link>
      </p>
    </main>
  );
}
