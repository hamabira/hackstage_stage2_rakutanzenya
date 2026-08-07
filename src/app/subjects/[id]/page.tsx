import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { notFound } from "next/navigation";

// TODO: 逆算結果の計算は後続issueで行う(科目詳細ダッシュボードUI実装issue)
export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subject = await getSubjectById(id);

  if (!subject) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <Link href="/dashboard" className="text-sm underline">
        ← ダッシュボードに戻る
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{subject.name} 詳細</h1>
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
          <p className="mt-2 text-sm text-gray-500">
            {subject.attendanceAffectsGrade 
              ? "計算結果は準備中です" 
              : "出席条件は設定されていません"}
          </p>
        </Card>
        <Card>
          <h2 className="font-medium">あと何点必要か</h2>
          <p className="mt-2 text-sm text-gray-500">
            {subject.targetScore 
              ? "計算結果は準備中です" 
              : "目標スコアが設定されていません"}
          </p>
        </Card>
      </div>
    </div>
  );
}
