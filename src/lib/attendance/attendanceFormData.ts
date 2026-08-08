import {
  isAttendanceStatus,
  type AttendanceFormValues,
} from "@/lib/attendance/attendanceFormValidation";

/** 値の妥当性ではなく、FormDataの形式そのものが壊れている場合の理由。 */
export type AttendanceFormDataError = "invalid_field_type" | "invalid_status";

export type ParseAttendanceFormDataResult =
  | { ok: true; values: AttendanceFormValues }
  | { ok: false; error: AttendanceFormDataError };

export type ParseDeleteFormDataResult =
  | { ok: true; recordId: string; subjectId: string }
  | { ok: false; error: AttendanceFormDataError };

/**
 * 文字列フィールドを取り出す。未送信は空文字として扱い、
 * ファイルなど文字列でない値が入っていた場合だけ失敗させる。
 */
function getStringField(formData: FormData, name: string): string | null {
  const value = formData.get(name);

  if (value === null) {
    return "";
  }

  return typeof value === "string" ? value : null;
}

/**
 * 出席記録フォームのFormDataを入力値の形へ変換する。
 * ここでは日付やメモの妥当性は判定せず、型として扱える形に整えるだけ。
 * 検証は validateAttendanceForm が担当する。
 */
export function parseAttendanceFormData(
  formData: FormData,
): ParseAttendanceFormDataResult {
  const subjectId = getStringField(formData, "subjectId");
  const classDate = getStringField(formData, "classDate");
  const status = getStringField(formData, "status");
  const memo = getStringField(formData, "memo");

  if (subjectId === null || classDate === null || status === null || memo === null) {
    return { ok: false, error: "invalid_field_type" };
  }

  // ステータスはラジオ・selectの選択肢に限られる。想定外の値は改ざんとみなす。
  if (!isAttendanceStatus(status)) {
    return { ok: false, error: "invalid_status" };
  }

  return { ok: true, values: { subjectId, classDate, status, memo } };
}

/** 削除フォームのFormDataから、対象の記録IDと再検証用の科目IDを取り出す。 */
export function parseDeleteAttendanceFormData(
  formData: FormData,
): ParseDeleteFormDataResult {
  const recordId = getStringField(formData, "recordId");
  const subjectId = getStringField(formData, "subjectId");

  if (recordId === null || subjectId === null) {
    return { ok: false, error: "invalid_field_type" };
  }

  return { ok: true, recordId, subjectId };
}
