import type { TestRecordFormValues } from "@/lib/grades/testRecordFormValidation";

/** FormDataの型が想定外で、入力値として解釈できない場合の理由。 */
export type TestRecordFormDataError = "invalid_field_type";

export type ParseTestRecordFormDataResult =
  | { ok: true; values: TestRecordFormValues }
  | { ok: false; error: TestRecordFormDataError };

export type ParseDeleteTestRecordFormDataResult =
  | { ok: true; subjectId: string; recordId: string }
  | { ok: false; error: TestRecordFormDataError };

/** 未送信は空文字、Fileなど文字列以外はnullとして扱う。 */
function getStringField(formData: FormData, name: string): string | null {
  const value = formData.get(name);

  if (value === null) {
    return "";
  }

  return typeof value === "string" ? value : null;
}

/** 点数記録フォームのFormDataを検証前の文字列入力へ変換する。 */
export function parseTestRecordFormData(formData: FormData): ParseTestRecordFormDataResult {
  const subjectId = getStringField(formData, "subjectId");
  const gradeItemId = getStringField(formData, "gradeItemId");
  const recordId = getStringField(formData, "recordId");
  const score = getStringField(formData, "score");
  const recordedAt = getStringField(formData, "recordedAt");
  const memo = getStringField(formData, "memo");

  if (
    subjectId === null ||
    gradeItemId === null ||
    recordId === null ||
    score === null ||
    recordedAt === null ||
    memo === null
  ) {
    return { ok: false, error: "invalid_field_type" };
  }

  return { ok: true, values: { subjectId, gradeItemId, recordId, score, recordedAt, memo } };
}

/** 点数記録削除フォームのFormDataから、対象IDと科目IDを取り出す。 */
export function parseDeleteTestRecordFormData(
  formData: FormData,
): ParseDeleteTestRecordFormDataResult {
  const subjectId = getStringField(formData, "subjectId");
  const recordId = getStringField(formData, "recordId");

  if (subjectId === null || recordId === null) {
    return { ok: false, error: "invalid_field_type" };
  }

  return { ok: true, subjectId, recordId };
}
