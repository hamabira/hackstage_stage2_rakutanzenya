import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getRedirectTo(request: NextRequest, nextPath: string | null) {
  const fallback = new URL("/dashboard", request.url);

  if (!nextPath) {
    return fallback;
  }

  try {
    const next = new URL(nextPath, request.url);
    return next.origin === request.nextUrl.origin ? next : fallback;
  } catch {
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const redirectTo = getRedirectTo(request, searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(redirectTo);
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=認証に失敗しました", request.url),
  );
}
