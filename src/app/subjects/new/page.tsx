import Link from "next/link";
<<<<<<< HEAD
import { createSubject } from "@/app/actions/subjects";
import { SubjectFormWrapper } from "@/components/subjects/SubjectFormWrapper";
=======
import { NewSubjectForm } from "@/components/subjects/NewSubjectForm";
>>>>>>> ab9fe9b4726c838b8521d45986b3449ebab7357d

export default function NewSubjectPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>
      <h1 className="text-xl font-semibold">科目を追加</h1>
<<<<<<< HEAD
      <SubjectFormWrapper action={createSubject} />
=======
      <NewSubjectForm />
>>>>>>> ab9fe9b4726c838b8521d45986b3449ebab7357d
    </div>
  );
}
