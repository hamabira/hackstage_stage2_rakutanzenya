import Link from "next/link";

// TODO: テスト・課題の点数記録入力・一覧表示は後続issueで行う(テスト/課題点数記録UI実装issue)
export default async function SubjectTestsPage({
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
      <h1 className="text-xl font-semibold">テスト・課題の記録</h1>
      <p className="text-sm text-gray-500">記録フォームは準備中です</p>
    </div>
  );
}
