import Link from "next/link";
import { SubjectSummaryCard } from "@/components/dashboard/SubjectSummaryCard";
import { getSubjects } from "@/lib/supabase/queries/subjects";

export default async function DashboardPage() {
  const subjects = await getSubjects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">ダッシュボード</h1>
        <Link href="/subjects/new" className="text-sm underline">
          科目を追加
        </Link>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-gray-500">
          登録済みの科目はまだありません。
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectSummaryCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
