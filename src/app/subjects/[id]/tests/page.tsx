import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { getGradeItemsBySubjectId } from "@/lib/supabase/queries/gradeItems";
import { getAllTestRecordsByGradeItemIds } from "@/lib/supabase/queries/testRecords";
import { createTestRecord, updateTestRecord } from "@/app/actions/testRecords";
import { TestRecordForm } from "@/components/tests/TestRecordForm";
import { DeleteTestRecordButton } from "@/components/tests/DeleteTestRecordButton";
import type { GradeItem, TestRecord } from "@/lib/types/domain";

const CATEGORY_LABEL: Record<string, string> = {
  attendance: "出席",
  assignment: "課題・レポート",
  test: "テスト",
  other: "その他",
};

/** 複数実績を 100 点換算して単純平均した値を返す。実績なしの場合は null。 */
function calcAverage(records: TestRecord[], maxScore: number): number | null {
  if (records.length === 0) return null;
  const sum = records.reduce((acc, r) => acc + (r.score / maxScore) * 100, 0);
  return Math.round((sum / records.length) * 10) / 10;
}

interface GradeItemSectionProps {
  subjectId: string;
  item: GradeItem;
  records: TestRecord[];
}

function GradeItemSection({ subjectId, item, records }: GradeItemSectionProps) {
  const maxScore = item.maxScore ?? 100;
  const latestRecord = records[0] ?? null;
  // 記録が2件以上ある場合は「複数回記録モード」として全件表示＋追加フォームを出す
  const isMultiRecord = records.length >= 2;
  const average = isMultiRecord ? calcAverage(records, maxScore) : null;

  const boundCreate = createTestRecord.bind(null, subjectId, item.id, maxScore);
  const boundUpdate = latestRecord
    ? updateTestRecord.bind(null, subjectId, latestRecord.id, maxScore)
    : null;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold text-gray-900">{item.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {CATEGORY_LABEL[item.category] ?? item.category}
            {" · "}重み {item.weight}%
            {" · "}満点 {maxScore}
          </p>
        </div>
        {/* 現在の得点サマリ */}
        <div className="text-right shrink-0">
          {isMultiRecord && average !== null ? (
            <p className="text-lg font-bold text-gray-900">
              {average}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / 100 換算平均（{records.length}件）
              </span>
            </p>
          ) : latestRecord !== null ? (
            <p className="text-lg font-bold text-gray-900">
              {latestRecord.score}
              <span className="text-sm font-normal text-gray-500 ml-1">
                / {maxScore}
              </span>
            </p>
          ) : (
            <p className="text-sm text-gray-400">未記録</p>
          )}
        </div>
      </div>

      {/* 入力フォーム */}
      {isMultiRecord ? (
        // 複数件モード: 新規追加フォームを常に表示
        <TestRecordForm
          itemName="新しい実績を追加"
          maxScore={maxScore}
          action={boundCreate}
        />
      ) : latestRecord === null ? (
        // 未記録: 新規フォーム
        <TestRecordForm
          itemName="点数を記録する"
          maxScore={maxScore}
          action={boundCreate}
        />
      ) : (
        // 1件記録済み: 編集フォーム
        boundUpdate && (
          <TestRecordForm
            itemName="記録を編集する"
            maxScore={maxScore}
            action={boundUpdate}
            defaultScore={latestRecord.score}
            defaultRecordedAt={latestRecord.recordedAt}
            defaultMemo={latestRecord.memo ?? ""}
            submitLabel="更新する"
          />
        )
      )}

      {/* 実績一覧 */}
      {records.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-100">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2">記録日</th>
                <th className="px-4 py-2">点数</th>
                <th className="px-4 py-2">100点換算</th>
                <th className="px-4 py-2">メモ</th>
                <th className="px-4 py-2 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-2 tabular-nums">{record.recordedAt}</td>
                  <td className="px-4 py-2 tabular-nums font-medium">
                    {record.score} / {maxScore}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-gray-600">
                    {Math.round((record.score / maxScore) * 100 * 10) / 10}
                  </td>
                  <td className="px-4 py-2 text-gray-500">
                    {record.memo ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <DeleteTestRecordButton
                      subjectId={subjectId}
                      recordId={record.id}
                      label={`${item.name} ${record.recordedAt}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 1件記録済みのとき、追加記録できることを案内する */}
      {!isMultiRecord && latestRecord !== null && (
        <p className="text-xs text-gray-400">
          さらに実績を追加したい場合は、上のフォームで別の日付で保存すると複数件記録できます。
        </p>
      )}
    </div>
  );
}

export default async function SubjectTestsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [subject, gradeItems] = await Promise.all([
    getSubjectById(id),
    getGradeItemsBySubjectId(id),
  ]);

  if (!subject) {
    notFound();
  }

  const gradeItemIds = gradeItems.map((item) => item.id);
  const allRecordsMap = await getAllTestRecordsByGradeItemIds(gradeItemIds);

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href={`/subjects/${id}`} className="text-sm underline">
        ← {subject.name} の詳細に戻る
      </Link>

      <h1 className="text-xl font-semibold">テスト・課題の記録</h1>

      {gradeItems.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-500">評価項目が登録されていません。</p>
          <Link
            href={`/subjects/${id}/edit`}
            className="mt-2 inline-block text-sm underline text-gray-700"
          >
            評価方法を編集して評価項目を追加する
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {gradeItems.map((item) => (
            <GradeItemSection
              key={item.id}
              subjectId={id}
              item={item}
              records={allRecordsMap[item.id] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}
