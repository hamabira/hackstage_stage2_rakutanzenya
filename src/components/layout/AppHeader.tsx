import Link from "next/link";
import { AppNavigation } from "@/components/layout/AppNavigation";

function Brand() {
  return (
    <Link className="flex items-center gap-2.5" href="/dashboard">
      <span className="font-display flex size-8 items-center justify-center rounded-lg bg-[#72d350] text-base font-bold text-[#20231f]">
        楽
      </span>
      <span className="font-display text-xl font-bold text-white">楽単前夜</span>
    </Link>
  );
}

/** 認証済み画面のブランド、ナビゲーション、ログアウト導線をまとめる。 */
export function AppHeader({ email }: { email: string }) {
  return (
    <>
      <aside className="hidden min-h-screen w-58 shrink-0 flex-col bg-[#20231f] px-6 py-8 md:flex">
        <Brand />
        <div className="mt-10">
          <AppNavigation />
        </div>
        <div className="mt-auto border-t border-white/10 pt-5">
          <p className="truncate text-xs text-[#8f978b]">{email}</p>
          <form action="/logout" className="mt-3" method="post">
            <button
              className="text-sm font-medium text-[#b9beb6] hover:text-white"
              type="submit"
            >
              ログアウト
            </button>
          </form>
        </div>
      </aside>

      <header className="flex h-17 items-center justify-between bg-[#20231f] px-5 md:hidden">
        <Brand />
        <span className="max-w-32 truncate text-xs text-[#b9beb6]">{email}</span>
      </header>
      <AppNavigation mobile />
    </>
  );
}
