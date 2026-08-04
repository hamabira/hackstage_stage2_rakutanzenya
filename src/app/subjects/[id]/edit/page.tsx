import Link from "next/link";
import { SubjectForm } from "@/components/subjects/SubjectForm";

// TODO: Supabaseからの科目データ取得は後続issueで行う(評価方法編集UI実装issue)
export default async function EditSubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← 科目詳細に戻る
      </Link>
      <h1 className="text-xl font-semibold">評価方法を編集</h1>
      <SubjectForm />
    </div>
  );
}
