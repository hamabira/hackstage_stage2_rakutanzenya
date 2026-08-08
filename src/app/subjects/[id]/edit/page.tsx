import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSubjectForm } from "@/components/subjects/DeleteSubjectForm";
import { SubjectForm } from "@/components/subjects/SubjectForm";
import { getSubject } from "@/lib/supabase/queries/subjects";

// TODO: Supabaseからの科目データ取得は後続issueで行う(評価方法編集UI実装issue)
export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subjectResult = await getSubject(id);

  if (!subjectResult.ok) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← 科目詳細に戻る
      </Link>
      <h1 className="text-xl font-semibold">評価方法を編集</h1>
      <SubjectForm />
      <section className="rounded-md border border-red-200 p-4">
        <h2 className="font-medium text-red-800">危険な操作</h2>
        <p className="mt-2 text-sm text-gray-600">
          「{subjectResult.subject.name}」を削除すると、評価項目・出席記録・点数記録もすべて削除されます。
        </p>
        <div className="mt-4">
          <DeleteSubjectForm subjectId={subjectResult.subject.id} subjectName={subjectResult.subject.name} />
        </div>
      </section>
    </div>
  );
}
