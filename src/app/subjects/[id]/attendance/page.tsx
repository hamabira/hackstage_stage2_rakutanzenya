import Link from "next/link";

// TODO: 出席記録の入力・一覧表示は後続issueで行う(出席記録入力UI実装issue)
export default async function SubjectAttendancePage({
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
      <h1 className="text-xl font-semibold">出席の記録</h1>
      <p className="text-sm text-gray-500">出席記録フォームは準備中です</p>
    </div>
  );
}
