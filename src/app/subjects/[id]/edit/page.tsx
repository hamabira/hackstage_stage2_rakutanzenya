import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSubjectForm } from "@/components/subjects/DeleteSubjectForm";
import { EditSubjectForm } from "@/components/subjects/EditSubjectForm";
import { getSubject } from "@/lib/supabase/queries/subjects";

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
      <Link className="text-sm font-semibold text-[#697067] hover:text-[#337a24]" href={`/subjects/${id}`}>
        {subjectResult.subject.name} / 評価方法を編集
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">評価方法を編集</h1>
        <p className="mt-2 text-sm text-[#697067]">計算に使う科目情報、出席条件、評価割合を更新します。</p>
      </div>
      <EditSubjectForm
        gradeItems={subjectResult.gradeItems}
        subject={subjectResult.subject}
      />
      <section className="max-w-4xl rounded-xl border border-red-200 bg-red-50/40 p-5">
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
