import { ProtectedAppShell } from "@/components/layout/ProtectedAppShell";

export default async function SubjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ProtectedAppShell>{children}</ProtectedAppShell>;
}
