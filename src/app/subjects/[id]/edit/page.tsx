import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { getGradeItemsBySubjectId } from "@/lib/supabase/queries/gradeItems";
import { updateSubject } from "@/app/actions/subjects";
import { SubjectFormWrapper } from "@/components/subjects/SubjectFormWrapper";

export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
      <h1 className="text-xl font-semibold">{subject.name} を編集</h1>
      <SubjectFormWrapper
        action={boundUpdateSubject}
        subject={subject}
        gradeItems={gradeItems}
      />
    </div>
  );
}
