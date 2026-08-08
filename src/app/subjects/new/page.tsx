import Link from "next/link";
import { NewSubjectForm } from "@/components/subjects/NewSubjectForm";

export default function NewSubjectPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>
      <h1 className="text-xl font-semibold">科目を追加</h1>
      <NewSubjectForm />
    </div>
  );
}
