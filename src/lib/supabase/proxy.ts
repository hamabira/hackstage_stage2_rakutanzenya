import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function setPrivateNoStore(response: NextResponse) {
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();

  if (!data?.claims.sub) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    const redirectResponse = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirectResponse);
    return setPrivateNoStore(redirectResponse);
  }

  return setPrivateNoStore(supabaseResponse);
}
