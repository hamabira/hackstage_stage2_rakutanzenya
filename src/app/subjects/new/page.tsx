import Link from "next/link";
import { NewSubjectForm } from "@/components/subjects/NewSubjectForm";

export default function NewSubjectPage() {
  return (
    <div className="flex flex-col gap-6">
      <Link className="text-sm font-semibold text-[#697067] hover:text-[#337a24]" href="/subjects">
        科目一覧 / 新規登録
      </Link>
      <div>
        <h1 className="font-display text-3xl font-bold">科目を追加</h1>
        <p className="mt-2 text-sm text-[#697067]">シラバスを見ながら、出席条件と評価割合を入力してください。</p>
      </div>
      <NewSubjectForm />
    </div>
  );
}
