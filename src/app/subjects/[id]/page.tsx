import Link from "next/link";
import { Card } from "@/components/ui/Card";

// TODO: Supabaseからの科目データ取得・逆算結果の計算は後続issueで行う(科目詳細ダッシュボードUI実装issue)
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-6">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">科目詳細</h1>
        <div className="flex gap-4 text-sm">
          <Link href={`/subjects/${id}/edit`} className="underline">
            評価方法を編集
          </Link>
          <Link href={`/subjects/${id}/attendance`} className="underline">
            出席を記録
          </Link>
          <Link href={`/subjects/${id}/tests`} className="underline">
            テスト・課題を記録
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="font-medium">あと何回休めるか</h2>
          <p className="mt-2 text-sm text-gray-500">計算結果は準備中です</p>
        </Card>
        <Card>
          <h2 className="font-medium">あと何点必要か</h2>
          <p className="mt-2 text-sm text-gray-500">計算結果は準備中です</p>
        </Card>
      </div>
    </div>
  );
}
