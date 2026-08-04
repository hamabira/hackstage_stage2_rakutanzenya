import Link from "next/link";

export function AppHeader() {
  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <nav className="flex items-center gap-4 text-sm font-medium">
        <Link href="/dashboard">ダッシュボード</Link>
        <Link href="/subjects">科目一覧</Link>
      </nav>
      <form action="/logout" method="post">
        <button type="submit" className="text-sm text-gray-600 underline">
          ログアウト
        </button>
      </form>
    </header>
  );
}
