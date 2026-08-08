import Link from "next/link";
import { SubjectCard } from "@/components/subjects/SubjectCard";
import { getSubjects } from "@/lib/supabase/queries/subjects";

export default async function SubjectsPage() {
  const subjects = await getSubjects();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-[#92988f]">SUBJECTS</p>
          <h1 className="font-display mt-1 text-3xl font-bold">科目一覧</h1>
          <p className="mt-1 text-sm text-[#697067]">出席条件と評価方法を科目ごとに管理します。</p>
        </div>
        <Link
          className="hidden rounded-full bg-[#72d350] px-5 py-3 text-sm font-bold hover:bg-[#64c544] sm:inline-flex"
          href="/subjects/new"
        >
          ＋ 科目を追加
        </Link>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-white p-8">
          <p className="font-display text-lg font-bold">登録済みの科目はまだありません</p>
          <p className="mt-2 text-sm text-[#697067]">最初の科目を追加して計算を始めましょう。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
