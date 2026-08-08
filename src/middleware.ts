import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 では `proxy.ts` が推奨だが、そちらは Node.js ランタイム固定で
// Cloudflare Workers のアダプタが未対応のため、edge ランタイムで動く
// `middleware.ts` を採用している。
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/subjects/:path*"],
};
