import type {
  AttendanceCalculationError,
  AttendanceRiskLevel,
} from "@/lib/calc/attendance";

/** 危険度ごとの表示ラベルと配色。 */
export const ATTENDANCE_RISK_PRESENTATION: Record<
  AttendanceRiskLevel,
  { label: string; className: string }
> = {
  on_track: { label: "余裕あり", className: "text-green-700" },
  caution: { label: "注意", className: "text-yellow-700" },
  danger: { label: "危険", className: "text-red-700" },
  exceeded: { label: "上限超過", className: "text-red-700" },
  unavailable: { label: "計算不可", className: "text-gray-500" },
};

/**
 * 計算できなかった理由を利用者向けの説明に変換する。
 * 「条件が未設定」と「データが不正」を区別できる文言にする。
 */
export const ATTENDANCE_CALCULATION_ERROR_MESSAGES: Record<
  AttendanceCalculationError,
  string
> = {
  missing_attendance_condition:
    "必要出席率または最大欠席数を登録すると、あと何回休めるかを計算できます。",
  invalid_total_class_count: "総授業回数が正しく登録されていません。科目設定を確認してください。",
  invalid_attended_count: "出席記録に不正な値が含まれています。",
  invalid_absent_count: "出席記録に不正な値が含まれています。",
  recorded_count_exceeds_total:
    "記録された授業回数が総授業回数を超えています。総授業回数か出席記録を見直してください。",
  invalid_required_rate: "必要出席率が0〜100の範囲外です。科目設定を確認してください。",
  invalid_max_absences: "最大欠席数が正しく登録されていません。科目設定を確認してください。",
};
