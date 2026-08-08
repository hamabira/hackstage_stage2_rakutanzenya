import type { TestRecordFormValues } from "@/lib/grades/testRecordFormValidation";

/** 値の妥当性ではなく、FormDataの形式そのものが壊れている場合の理由。 */
export type TestRecordFormDataError = "invalid_field_type";

export type ParseTestRecordFormDataResult =
  | { ok: true; values: TestRecordFormValues }
  | { ok: false; error: TestRecordFormDataError };

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
 * 得点記録フォームのFormDataを入力値の形へ変換する。
 * 値の妥当性は判定せず、型として扱える形に整えるだけ。
 */
export function parseTestRecordFormData(
  formData: FormData,
): ParseTestRecordFormDataResult {
  const recordId = getStringField(formData, "recordId");
  const gradeItemId = getStringField(formData, "gradeItemId");
  const score = getStringField(formData, "score");
  const recordedAt = getStringField(formData, "recordedAt");
  const memo = getStringField(formData, "memo");

  if (
    recordId === null ||
    gradeItemId === null ||
    score === null ||
    recordedAt === null ||
    memo === null
  ) {
    return { ok: false, error: "invalid_field_type" };
  }

  return { ok: true, values: { recordId, gradeItemId, score, recordedAt, memo } };
}
