import Link from "next/link";
import { notFound } from "next/navigation";
<<<<<<< HEAD
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { getGradeItemsBySubjectId } from "@/lib/supabase/queries/gradeItems";
import { updateSubject } from "@/app/actions/subjects";
import { SubjectFormWrapper } from "@/components/subjects/SubjectFormWrapper";
=======
import { DeleteSubjectForm } from "@/components/subjects/DeleteSubjectForm";
import { EditSubjectForm } from "@/components/subjects/EditSubjectForm";
import { getSubject } from "@/lib/supabase/queries/subjects";
>>>>>>> ab9fe9b4726c838b8521d45986b3449ebab7357d

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

  const [subject, gradeItems] = await Promise.all([
    getSubjectById(id),
    getGradeItemsBySubjectId(id),
  ]);

  if (!subject) {
    notFound();
  }

  // updateSubject(subjectId, prevState, formData) を bind で部分適用する
  const boundUpdateSubject = updateSubject.bind(null, id);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← 科目詳細に戻る
      </Link>
<<<<<<< HEAD
      <h1 className="text-xl font-semibold">{subject.name} を編集</h1>
      <SubjectFormWrapper
        action={boundUpdateSubject}
        subject={subject}
        gradeItems={gradeItems}
      />
=======
      <h1 className="text-xl font-semibold">評価方法を編集</h1>
      <EditSubjectForm
        gradeItems={subjectResult.gradeItems}
        subject={subjectResult.subject}
      />
      <section className="rounded-md border border-red-200 p-4">
        <h2 className="font-medium text-red-800">危険な操作</h2>
        <p className="mt-2 text-sm text-gray-600">
          「{subjectResult.subject.name}」を削除すると、評価項目・出席記録・点数記録もすべて削除されます。
        </p>
        <div className="mt-4">
          <DeleteSubjectForm subjectId={subjectResult.subject.id} subjectName={subjectResult.subject.name} />
        </div>
      </section>
>>>>>>> ab9fe9b4726c838b8521d45986b3449ebab7357d
    </div>
  );
}
