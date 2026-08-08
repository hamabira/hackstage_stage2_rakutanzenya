import Link from "next/link";
import type { GradeItem, Subject } from "@/lib/types/domain";
import type { AttendanceCalcResult, AttendanceRiskLevel } from "@/lib/calc/attendance";
import type { GradeGoalResult } from "@/lib/calc/gradeGoal";

interface SubjectSummaryCardProps {
  subject: Subject;
  gradeItems: GradeItem[];
  attendanceResult: AttendanceCalcResult | null;
  gradeResult: GradeGoalResult | null;
}

// ─────────────────────────────────────────
// 危険度の設定（テキスト・色・アイコン）
// ─────────────────────────────────────────

const RISK_CONFIG: Record<
  AttendanceRiskLevel,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  on_track: {
    label: "順調",
    icon: "✓",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
  },
  caution: {
    label: "注意",
    icon: "!",
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    border: "border-yellow-200",
  },
  danger: {
    label: "危険",
    icon: "!!",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  exceeded: {
    label: "超過",
    icon: "✕",
    bg: "bg-red-100",
    text: "text-red-800",
    border: "border-red-300",
  },
  unavailable: {
    label: "—",
    icon: "?",
    bg: "bg-gray-50",
    text: "text-gray-500",
    border: "border-gray-200",
  },
};

// ─────────────────────────────────────────
// カード全体の左ボーダー色（最も危険な状態を優先）
// ─────────────────────────────────────────

function getCardAccentClass(
  att: AttendanceCalcResult | null,
  grd: GradeGoalResult | null,
): string {
  if (att?.riskLevel === "exceeded" || att?.riskLevel === "danger") {
    return "border-l-4 border-l-red-400";
  }
  if (att?.riskLevel === "caution" || (grd && !grd.isAchievable)) {
    return "border-l-4 border-l-yellow-400";
  }
  if (att?.riskLevel === "on_track" || (grd?.isAchievable && grd.requiredAverageOnRemaining === 0)) {
    return "border-l-4 border-l-emerald-400";
  }
  return "border-l-4 border-l-transparent";
}

// ─────────────────────────────────────────
// 出席セル
// ─────────────────────────────────────────

function AttendanceChip({ result, subject }: {
  result: AttendanceCalcResult | null;
  subject: Pick<Subject, "attendanceAffectsGrade">;
}) {
  // 出席が成績に影響しない科目
  if (!subject.attendanceAffectsGrade) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">出席</span>
        <span className="text-xs text-gray-300">影響なし</span>
      </div>
    );
  }

  // 計算結果なし（出席条件未設定など）
  if (!result) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">出席</span>
        <span className="text-xs text-gray-300">条件未設定</span>
      </div>
    );
  }

  const { riskLevel, remainingAllowedAbsences, currentAttendanceRate, calculationError } = result;
  const cfg = RISK_CONFIG[riskLevel];

  // 計算不能（エラーあり）
  if (riskLevel === "unavailable" && calculationError) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">出席</span>
        <span className="text-xs text-gray-300">計算不能</span>
        {currentAttendanceRate !== null && (
          <span className="text-xs text-gray-400">{currentAttendanceRate}%</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">あと休める回数</span>
      <div className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${cfg.bg} ${cfg.border}`}>
        <span className={`text-xs font-bold ${cfg.text}`} aria-hidden="true">
          {cfg.icon}
        </span>
        <span className={`text-sm font-bold ${cfg.text}`}>
          {remainingAllowedAbsences !== null
            ? remainingAllowedAbsences < 0
              ? `${remainingAllowedAbsences}回（超過）`
              : `${remainingAllowedAbsences}回`
            : "—"}
        </span>
        <span className={`text-xs font-semibold ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>
      {currentAttendanceRate !== null && (
        <span className="text-xs text-gray-400">出席率 {currentAttendanceRate}%</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────
// 成績セル
// ─────────────────────────────────────────

function GradeChip({ result, subject }: {
  result: GradeGoalResult | null;
  subject: Pick<Subject, "targetScore" | "targetGradeLabel">;
}) {
  // 目標未設定
  if (!subject.targetScore) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">成績</span>
        <span className="text-xs text-gray-300">目標未設定</span>
      </div>
    );
  }

  // 評価項目なし・計算結果なし
  if (!result) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-gray-400">成績</span>
        <span className="text-xs text-gray-300">評価項目なし</span>
      </div>
    );
  }

  const { requiredAverageOnRemaining, isAchievable } = result;

  // 目標達成済み
  if (requiredAverageOnRemaining === 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">必要平均点</span>
        <div className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1">
          <span className="text-xs font-bold text-blue-700" aria-hidden="true">✓</span>
          <span className="text-sm font-bold text-blue-700">達成済み</span>
        </div>
      </div>
    );
  }

  // 達成不可能
  if (!isAchievable) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-400">必要平均点</span>
        <div className="inline-flex items-center gap-1 rounded-md border border-orange-200 bg-orange-50 px-2 py-1">
          <span className="text-xs font-bold text-orange-700" aria-hidden="true">✕</span>
          <span className="text-sm font-bold text-orange-700">達成困難</span>
        </div>
        {requiredAverageOnRemaining !== null && (
          <span className="text-xs text-orange-500">
            必要 {requiredAverageOnRemaining}% / 100
          </span>
        )}
      </div>
    );
  }

  // 通常（必要平均点あり）
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">必要平均点</span>
      <div className="inline-flex items-center gap-0.5 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-1">
        <span className="text-sm font-bold text-indigo-700 tabular-nums">
          {requiredAverageOnRemaining}
        </span>
        <span className="text-xs text-indigo-500">/ 100</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// カード本体
// ─────────────────────────────────────────

export function SubjectSummaryCard({
  subject,
  gradeItems,
  attendanceResult,
  gradeResult,
}: SubjectSummaryCardProps) {
  const accentClass = getCardAccentClass(attendanceResult, gradeResult);

  // isAtRisk または達成困難のとき、カード全体に警告感を付与
  const isAlert =
    (attendanceResult?.isAtRisk ?? false) ||
    (gradeResult !== null && !gradeResult.isAchievable);

  return (
    <Link
      href={`/subjects/${subject.id}`}
      className={[
        "block rounded-xl border bg-white shadow-sm transition-all",
        "hover:shadow-md hover:-translate-y-0.5",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
        accentClass,
        isAlert ? "ring-1 ring-yellow-300" : "",
      ].join(" ")}
      aria-label={`${subject.name}の詳細を見る`}
    >
      <div className="p-4 flex flex-col gap-3">
        {/* ヘッダー: 科目名 + 目標ラベル */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 leading-tight">
            {subject.name}
          </h3>
          {subject.targetGradeLabel && (
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 border border-indigo-100">
              {subject.targetGradeLabel}
            </span>
          )}
        </div>

        {/* 計算結果: 出席 + 成績を横並び */}
        <div className="grid grid-cols-2 gap-3 rounded-lg bg-gray-50 p-3">
          <AttendanceChip result={attendanceResult} subject={subject} />
          <div className="border-l border-gray-200 pl-3">
            <GradeChip result={gradeResult} subject={subject} />
          </div>
        </div>

        {/* 評価項目の概要（最大3件表示） */}
        {gradeItems.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {gradeItems.slice(0, 3).map((item) => (
              <span
                key={item.id}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {item.name} {item.weight}%
              </span>
            ))}
            {gradeItems.length > 3 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                他 {gradeItems.length - 3} 件
              </span>
            )}
          </div>
        )}

        {/* データなし案内 */}
        {gradeItems.length === 0 && (
          <p className="text-xs text-gray-400">
            評価方法が未設定です
          </p>
        )}
      </div>
    </Link>
  );
}
