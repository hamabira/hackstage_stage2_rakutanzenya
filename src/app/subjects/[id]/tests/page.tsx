import Link from "next/link";
import { notFound } from "next/navigation";
import { TestRecordManager } from "@/components/grades/TestRecordManager";
import { Card } from "@/components/ui/Card";
import { summarizeGradeItemScores } from "@/lib/grades/gradeItemScores";
import { getTestRecordsBySubjectId } from "@/lib/supabase/queries/grades";
import { getSubject } from "@/lib/supabase/queries/subjects";

export default async function SubjectTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const subjectResult = await getSubject(id);

  // 他ユーザーの科目はRLSにより not_found となるため、存在の有無を区別しない。
  if (!subjectResult.ok) {
    notFound();
  }

  const testRecordsResult = await getTestRecordsBySubjectId(id);
  const records = testRecordsResult.ok ? testRecordsResult.records : [];

  const gradeItemScores = summarizeGradeItemScores(
    subjectResult.gradeItems,
    records,
  );

  // 記録は評価項目の表示順、その中では実施日順に並べる。
  const sortOrderByGradeItemId = new Map(
    subjectResult.gradeItems.map((item) => [item.id, item.sortOrder]),
  );
  const sortedRecords = [...records].sort((first, second) => {
    const orderDiff =
      (sortOrderByGradeItemId.get(first.gradeItemId) ?? 0) -
      (sortOrderByGradeItemId.get(second.gradeItemId) ?? 0);

    return orderDiff !== 0
      ? orderDiff
      : first.recordedAt.localeCompare(second.recordedAt);
  });

  return (
    <div className="flex flex-col gap-6">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← 科目詳細に戻る
      </Link>

      <div>
        <h1 className="text-xl font-semibold">テスト・課題の記録</h1>
        <p className="mt-1 text-sm text-gray-600">{subjectResult.subject.name}</p>
      </div>

      {testRecordsResult.ok ? null : (
        <Card className="border-red-300 bg-red-50">
          <p className="text-sm text-red-700" role="alert">
            得点記録の取得に失敗しました。時間をおいて画面を再読み込みしてください。
          </p>
        </Card>
      )}

      <Card>
        <h2 className="font-medium">評価項目ごとの現在の得点</h2>
        {gradeItemScores.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">評価項目が登録されていません。</p>
        ) : (
          <dl className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
            {gradeItemScores.map(({ gradeItem, currentScore, recordCount }) => (
              <div className="flex justify-between gap-2" key={gradeItem.id}>
                <dt>
                  {gradeItem.name}
                  <span className="ml-2 text-gray-500">({gradeItem.weight}%)</span>
                </dt>
                <dd>
                  {currentScore === null
                    ? "未記録"
                    : `${currentScore} / ${gradeItem.maxScore ?? "満点未設定"}`}
                  {recordCount > 1 ? (
                    <span className="ml-1 text-gray-500">({recordCount}件の平均)</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      <TestRecordManager
        gradeItems={subjectResult.gradeItems}
        records={sortedRecords}
        subjectId={id}
      />
    </div>
  );
}
