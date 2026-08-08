import { redirect } from "next/navigation";
import { AppHeader } from "@/components/layout/AppHeader";
import { createClient } from "@/lib/supabase/server";

export async function ProtectedAppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <AppHeader email={user.email ?? "メールアドレス未設定"} />
      <main className="min-w-0 flex-1 px-5 py-6 pb-24 sm:px-8 md:px-10 md:py-8 md:pb-8 xl:px-11">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
