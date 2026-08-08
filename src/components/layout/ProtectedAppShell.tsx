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
    <div className="flex min-h-full flex-1 flex-col">
      <AppHeader />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
