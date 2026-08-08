import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectById } from "@/lib/supabase/queries/subjects";
import { getGradeItemsBySubjectId } from "@/lib/supabase/queries/gradeItems";
import { getAttendanceRecordsBySubjectId } from "@/lib/supabase/queries/attendanceRecords";
import { getAllTestRecordsByGradeItemIds } from "@/lib/supabase/queries/testRecords";
import { calcRemainingAbsences } from "@/lib/calc/attendance";
import { calcRequiredScore } from "@/lib/calc/gradeGoal";
import type { AttendanceCalcResult, AttendanceRiskLevel } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";
import type { GradeItem, TestRecord } from "@/lib/types/domain";

// ─────────────────────────────────────────
// 出席カード
// ─────────────────────────────────────────

const RISK_STYLE: Record<AttendanceRiskLevel, string> = {
  on_track: "bg-emerald-50 border-emerald-200 text-emerald-800",
  caution: "bg-yellow-50 border-yellow-200 text-yellow-800",
  danger: "bg-red-50 border-red-200 text-red-800",
  exceeded: "bg-red-100 border-red-300 text-red-900",
  unavailable: "bg-gray-50 border-gray-200 text-gray-600",
};

const RISK_LABEL: Record<AttendanceRiskLevel, string> = {
  on_track: "順調",
  caution: "注意",
  danger: "危険",
  exceeded: "条件超過",
  unavailable: "—",
};

function AttendanceCard({
  subjectId,
  subject,
  result,
  presentCount,
  absentCount,
}: {
  subjectId: string;
  subject: {
    attendanceAffectsGrade: boolean;
    attendanceRequiredRate: number | null;
    attendanceMaxAbsences: number | null;
    totalClassCount: number | null;
  };
  result: AttendanceCalcResult | null;
  presentCount: number;
  absentCount: number;
}) {
  const hasCondition =
    subject.attendanceRequiredRate !== null ||
    subject.attendanceMaxAbsences !== null;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">あと何回休めるか</h2>
        {result && (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${RISK_STYLE[result.riskLevel]}`}
          >
            {RISK_LABEL[result.riskLevel]}
          </span>
        )}
      </div>

      {!subject.attendanceAffectsGrade && (
        <p className="text-sm text-gray-400">出席が成績に影響しない科目です</p>
      )}

      {subject.attendanceAffectsGrade && !hasCondition && (
        <p className="text-sm text-gray-400">
          出席条件が未設定です。
          <Link href={`/subjects/${subjectId}/edit`} className="underline ml-1">
            評価方法を編集
          </Link>
          して必要出席率または最大欠席数を設定してください。
        </p>
      )}

      {subject.attendanceAffectsGrade && hasCondition && result && (
        <>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {presentCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">出席回数</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {absentCount}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">欠席回数</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-900 tabular-nums">
                {result.currentAttendanceRate !== null
                  ? `${result.currentAttendanceRate}%`
                  : "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">現在の出席率</p>
            </div>
          </div>

          {result.remainingAllowedAbsences !== null ? (
            <div
              className={`rounded-lg border px-4 py-3 ${RISK_STYLE[result.riskLevel]}`}
            >
              <p className="text-sm font-medium">
                残り許容欠席回数:{" "}
                <span className="text-xl font-bold">
                  {result.remainingAllowedAbsences}回
                </span>
              </p>
              {result.riskLevel === "exceeded" && (
                <p className="text-xs mt-1">すでに許容欠席数を超過しています</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">
              計算できません（{result.calculationError}）
            </p>
          )}

          <div className="text-xs text-gray-400 space-y-0.5">
            {subject.attendanceRequiredRate !== null && (
              <p>必要出席率: {subject.attendanceRequiredRate}%</p>
            )}
            {subject.attendanceMaxAbsences !== null && (
              <p>最大欠席数: {subject.attendanceMaxAbsences}回</p>
            )}
            <p>総授業回数: {subject.totalClassCount}回</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// 成績カード
// ─────────────────────────────────────────

function GradeGoalCard({
  subjectId,
  subject,
  result,
  gradeItems,
  allRecordsMap,
}: {
  subjectId: string;
  subject: { targetScore: number | null; targetGradeLabel: string | null };
  result: GradeGoalResult | null;
  gradeItems: GradeItem[];
  allRecordsMap: Record<string, TestRecord[]>;
}) {
  const hasTarget = subject.targetScore !== null;
  const hasItems = gradeItems.length > 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-5 shadow-sm bg-white">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">あと何点必要か</h2>
        {subject.targetGradeLabel && (
          <span className="rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 px-2.5 py-0.5 text-xs font-semibold">
            目標: {subject.targetGradeLabel}
          </span>
        )}
      </div>

      {!hasTarget && (
        <p className="text-sm text-gray-400">
          目標点数が未設定です。
          <Link href={`/subjects/${subjectId}/edit`} className="underline ml-1">
            評価方法を編集
          </Link>
          して設定してください。
        </p>
      )}

      {hasTarget && !hasItems && (
        <p className="text-sm text-gray-400">
          評価項目が登録されていません。評価方法を編集してください。
        </p>
      )}

      {hasTarget && hasItems && result && (
        <>
          {result.requiredAverageOnRemaining === 0 ? (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
              <p className="font-semibold text-lg">目標達成済み 🎉</p>
              <p className="text-sm mt-0.5">
                目標点数 {subject.targetScore} をすでに達成しています
              </p>
            </div>
          ) : result.isAchievable && result.requiredAverageOnRemaining !== null ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-sm text-gray-500">残り評価項目で必要な平均点</p>
              <p className="text-3xl font-bold text-gray-900 tabular-nums mt-1">
                {result.requiredAverageOnRemaining}
                <span className="text-base font-normal text-gray-500 ml-1">
                  / 100
                </span>
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-orange-800">
              <p className="font-semibold">目標達成が難しい状況です</p>
              <p className="text-sm mt-0.5">
                すべての未評価項目で満点を取っても目標点数に届きません
              </p>
            </div>
          )}

          {/* 評価項目ごとの得点詳細 */}
          <div className="overflow-hidden rounded-lg border border-gray-100">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-2">評価項目</th>
                  <th className="px-3 py-2">重み</th>
                  <th className="px-3 py-2">取得点</th>
                  <th className="px-3 py-2">100点換算</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {gradeItems.map((item) => {
                  const records = allRecordsMap[item.id] ?? [];
                  const maxScore = item.maxScore ?? 100;

                  let displayScore: string;
                  let normalized: string;

                  if (records.length === 0) {
                    displayScore = "未記録";
                    normalized = "—";
                  } else if (records.length >= 2) {
                    // 複数件: 100点換算平均
                    const avg =
                      records.reduce(
                        (acc, r) => acc + (r.score / maxScore) * 100,
                        0,
                      ) / records.length;
                    displayScore = `${records.length}件の平均`;
                    normalized = `${Math.round(avg * 10) / 10}`;
                  } else {
                    // 1件: 最新値
                    const latest = records[0];
                    displayScore = `${latest.score} / ${maxScore}`;
                    normalized = `${Math.round((latest.score / maxScore) * 100 * 10) / 10}`;
                  }

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2 font-medium text-gray-800">
                        {item.name}
                      </td>
                      <td className="px-3 py-2 text-gray-500">{item.weight}%</td>
                      <td className="px-3 py-2 tabular-nums text-gray-700">
                        {displayScore}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gray-700">
                        {normalized}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400">
            目標点数: {subject.targetScore}（100点換算）
          </p>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// ページ本体
// ─────────────────────────────────────────

export default async function SubjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [subject, gradeItems, attendanceRecords] = await Promise.all([
    getSubjectById(id),
    getGradeItemsBySubjectId(id),
    getAttendanceRecordsBySubjectId(id),
  ]);

  if (!subject) {
    notFound();
  }

  const gradeItemIds = gradeItems.map((item) => item.id);
  const allRecordsMap = await getAllTestRecordsByGradeItemIds(gradeItemIds);

  const presentCount = attendanceRecords.filter(
    (r) => r.status === "present",
  ).length;
  const absentCount = attendanceRecords.filter(
    (r) => r.status === "absent",
  ).length;

  // 出席逆算
  let attendanceResult: AttendanceCalcResult | null = null;
  if (
    subject.attendanceAffectsGrade &&
    subject.totalClassCount !== null &&
    (subject.attendanceRequiredRate !== null ||
      subject.attendanceMaxAbsences !== null)
  ) {
    attendanceResult = calcRemainingAbsences({
      totalClassCount: subject.totalClassCount,
      attendedCount: presentCount,
      absentCount,
      requiredRate: subject.attendanceRequiredRate,
      maxAbsences: subject.attendanceMaxAbsences,
    });
  }

  // 成績逆算: 複数件は100点換算平均、1件は最新値
  let gradeResult: GradeGoalResult | null = null;
  if (subject.targetScore !== null && gradeItems.length > 0) {
    gradeResult = calcRequiredScore({
      targetScore: subject.targetScore,
      gradeItems: gradeItems.map((item) => {
        const records = allRecordsMap[item.id] ?? [];
        const maxScore = item.maxScore ?? 100;
        let currentScore: number | null = null;

        if (records.length >= 2) {
          currentScore =
            records.reduce((acc, r) => acc + (r.score / maxScore) * 100, 0) /
            records.length;
        } else if (records.length === 1) {
          currentScore = (records[0].score / maxScore) * 100;
        }

        return { weight: item.weight, maxScore: 100, currentScore };
      }),
    });
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <Link href="/subjects" className="text-sm underline">
        ← 科目一覧に戻る
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">{subject.name}</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/subjects/${id}/edit`}
            className="rounded-md border px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            評価方法を編集
          </Link>
          <Link
            href={`/subjects/${id}/attendance`}
            className="rounded-md border px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            出席を記録
          </Link>
          <Link
            href={`/subjects/${id}/tests`}
            className="rounded-md border px-3 py-1.5 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            テスト・課題を記録
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AttendanceCard
          subjectId={id}
          subject={subject}
          result={attendanceResult}
          presentCount={presentCount}
          absentCount={absentCount}
        />
        <GradeGoalCard
          subjectId={id}
          subject={subject}
          result={gradeResult}
          gradeItems={gradeItems}
          allRecordsMap={allRecordsMap}
        />
      </div>

      {attendanceRecords.length === 0 && gradeItemIds.length === 0 && (
        <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
          <p>まだデータがありません。</p>
          <div className="mt-3 flex justify-center gap-4">
            <Link
              href={`/subjects/${id}/edit`}
              className="underline text-gray-700"
            >
              評価方法を設定する
            </Link>
            <Link
              href={`/subjects/${id}/attendance`}
              className="underline text-gray-700"
            >
              出席を記録する
            </Link>
            <Link
              href={`/subjects/${id}/tests`}
              className="underline text-gray-700"
            >
              点数を記録する
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
