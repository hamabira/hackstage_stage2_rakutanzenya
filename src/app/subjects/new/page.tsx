import Link from "next/link";
import { createSubject } from "@/app/actions/subjects";
import { SubjectFormWrapper } from "@/components/subjects/SubjectFormWrapper";

export default function NewSubjectPage() {
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>
      <h1 className="text-xl font-semibold">科目を追加</h1>
      <SubjectFormWrapper action={createSubject} />
    </div>
  );
}
