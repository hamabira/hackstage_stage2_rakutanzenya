import type { AttendanceStatus } from "@/lib/types/domain";

/** メモの最大文字数。DB側は text 型で無制限のため、アプリ側の方針として決める。 */
export const MEMO_MAX_LENGTH = 500;

export const ATTENDANCE_STATUSES: readonly AttendanceStatus[] = [
  "present",
  "absent",
  "late",
  "excused",
];

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "出席",
  absent: "欠席",
  late: "遅刻",
  excused: "公欠",
};

export interface AttendanceFormValues {
  subjectId: string;
  /** YYYY-MM-DD 形式の授業日。 */
  classDate: string;
  status: AttendanceStatus;
  memo: string;
}

export type AttendanceFormErrors = Record<string, string>;

const CLASS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isAttendanceStatus(value: string): value is AttendanceStatus {
  return (ATTENDANCE_STATUSES as readonly string[]).includes(value);
}

/**
 * YYYY-MM-DD が実在する日付かを確認する。
 * 2026-02-30 のような書式は正しいが存在しない日付を弾く。
 */
export function isValidClassDate(value: string): boolean {
  if (!CLASS_DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** 出席記録の入力値を検証し、フィールド名をキーにしたエラー文を返す。 */
export function validateAttendanceForm(
  values: AttendanceFormValues,
): AttendanceFormErrors {
  const errors: AttendanceFormErrors = {};

  if (values.subjectId.trim() === "") {
    errors.subjectId = "科目が指定されていません。";
  }

  if (values.classDate.trim() === "") {
    errors.classDate = "授業日を入力してください。";
  } else if (!isValidClassDate(values.classDate)) {
    errors.classDate = "授業日はYYYY-MM-DD形式の実在する日付で入力してください。";
  }

  if (values.memo.length > MEMO_MAX_LENGTH) {
    errors.memo = `メモは${MEMO_MAX_LENGTH}文字以内で入力してください。`;
  }

  return errors;
}
