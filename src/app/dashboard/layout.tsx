import { ProtectedAppShell } from "@/components/layout/ProtectedAppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedAppShell>{children}</ProtectedAppShell>;
}
