import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface AuthPageProps {
  action: (formData: FormData) => void | Promise<void>;
  alternateAction: {
    description: string;
    href: string;
    label: string;
  };
  error?: string;
  passwordMinLength?: number;
  submitLabel: string;
  title: string;
}

export function AuthPage({
  action,
  alternateAction,
  error,
  passwordMinLength,
  submitLabel,
  title,
}: AuthPageProps) {
  return (
    <main className="grid min-h-screen flex-1 bg-[#f7f6f2] lg:grid-cols-[minmax(20rem,0.9fr)_1.1fr]">
      <section className="hidden flex-col justify-between bg-[#20231f] p-12 text-white lg:flex">
        <Link className="flex items-center gap-3" href="/">
          <span className="font-display flex size-10 items-center justify-center rounded-xl bg-[#72d350] text-xl font-bold text-[#20231f]">
            ユ
          </span>
          <span className="font-display text-2xl font-bold">ユル単</span>
        </Link>
        <div className="max-w-md">
          <p className="text-sm font-bold text-[#72d350]">学生のための成績・出席管理</p>
          <h2 className="font-display mt-4 text-4xl font-bold leading-tight">
            あと何回休めるか、あと何点必要かを迷わない。
          </h2>
          <p className="mt-5 leading-7 text-[#b9beb6]">
            科目ごとの出席条件と評価割合をまとめて、次に取るべき行動を確認できます。
          </p>
        </div>
        <p className="text-xs text-[#7f877c]">出席と成績を、自分のペースで。</p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-8">
        <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
          <Link className="mb-8 flex items-center gap-2 lg:hidden" href="/">
            <span className="font-display flex size-8 items-center justify-center rounded-lg bg-[#72d350] font-bold">
              ユ
            </span>
            <span className="font-display text-xl font-bold">ユル単</span>
          </Link>
          <p className="text-xs font-bold text-[#337a24]">WELCOME</p>
          <h1 className="font-display mt-2 text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-[#697067]">続けるには認証情報を入力してください。</p>

          {error && (
            <p
              aria-live="polite"
              className="mt-5 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </p>
          )}

          <form action={action} className="mt-7 flex flex-col gap-5">
            <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor="email">
              メールアドレス
              <input
                className="min-h-11 px-3 py-2 font-normal"
                id="email"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-semibold" htmlFor="password">
              パスワード
              <input
                className="min-h-11 px-3 py-2 font-normal"
                id="password"
                minLength={passwordMinLength}
                name="password"
                required
                type="password"
              />
              {passwordMinLength ? (
                <span className="text-xs font-normal text-[#92988f]">
                  {passwordMinLength}文字以上で入力してください
                </span>
              ) : null}
            </label>
            <Button className="mt-1 w-full" type="submit">{submitLabel}</Button>
          </form>

          <p className="mt-6 text-sm text-[#697067]">
            {alternateAction.description}{" "}
            <Link className="font-bold text-[#337a24] hover:underline" href={alternateAction.href}>
              {alternateAction.label}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
