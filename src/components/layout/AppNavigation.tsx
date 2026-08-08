"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", shortLabel: "ホーム" },
  { href: "/subjects", label: "科目一覧", shortLabel: "科目" },
  { href: "/subjects/new", label: "科目を追加", shortLabel: "追加" },
] as const;

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }

  if (href === "/subjects/new") {
    return pathname === href;
  }

  return (
    pathname === href ||
    (pathname.startsWith(`${href}/`) && !pathname.startsWith("/subjects/new"))
  );
}

/** 現在地を示しながら、デスクトップとモバイルの主要導線を描画する。 */
export function AppNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();

  if (mobile) {
    return (
      <nav
        aria-label="モバイルナビゲーション"
        className="fixed inset-x-0 bottom-0 z-30 grid h-16 grid-cols-3 border-t bg-white px-4 pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-xs font-semibold ${
                active ? "text-[#337a24]" : "text-[#7b8278]"
              }`}
              href={item.href}
              key={item.href}
            >
              <span aria-hidden className="text-lg leading-none">
                {item.href === "/dashboard" ? "⌂" : item.href === "/subjects" ? "□" : "+"}
              </span>
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="メインナビゲーション" className="flex flex-col gap-2">
      {NAV_ITEMS.map((item) => {
        const active = isActivePath(pathname, item.href);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              active
                ? "bg-white/10 text-white"
                : "text-[#b9beb6] hover:bg-white/5 hover:text-white"
            }`}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
