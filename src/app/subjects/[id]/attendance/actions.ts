"use server";

import { revalidatePath } from "next/cache";
import {
  parseAttendanceFormData,
  parseDeleteAttendanceFormData,
} from "@/lib/attendance/attendanceFormData";
import type { AttendanceFormState } from "@/lib/attendance/attendanceFormState";
import { validateAttendanceForm } from "@/lib/attendance/attendanceFormValidation";
import {
  deleteAttendanceRecord,
  saveAttendanceRecord,
  type AttendanceQueryError,
} from "@/lib/supabase/queries/attendance";
import { getSubject } from "@/lib/supabase/queries/subjects";

const ERROR_MESSAGES: Record<AttendanceQueryError, string> = {
  unauthenticated: "ログインの有効期限が切れています。再度ログインしてください。",
  not_found: "対象の記録が見つかりません。画面を再読み込みしてください。",
  constraint_violation: "入力内容がDBの制約に違反しています。入力値を確認してください。",
  unknown: "保存に失敗しました。時間をおいて再度お試しください。",
};

function toFailure(message: string): AttendanceFormState {
  return { fieldErrors: {}, message, success: false };
}

/** 保存・削除後に、集計を表示する画面のキャッシュをまとめて再検証する。 */
function revalidateAttendanceViews(subjectId: string) {
  revalidatePath(`/subjects/${subjectId}`);
  revalidatePath(`/subjects/${subjectId}/attendance`);
  revalidatePath("/dashboard");
}

/**
 * 対象科目が本人のものかを確認する。
 * RLSでも防げるが、権限エラーを利用者向けの文言で返すために明示的に確認する。
 */
async function assertSubjectOwned(subjectId: string): Promise<string | null> {
  const subject = await getSubject(subjectId);

  if (subject.ok) {
    return null;
  }

  if (subject.error === "unauthenticated") {
    return ERROR_MESSAGES.unauthenticated;
  }

  // 他ユーザーの科目はRLSにより not_found として返るため、存在の有無を区別しない。
  return "対象の科目が見つかりません。";
}

/**
 * 出席記録を保存する。同一科目・同一授業日の記録は上書きされる。
 * 失敗時はフィールドエラーを返し、フォーム側が入力値を保持したまま再表示する。
 */
export async function saveAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const parsed = parseAttendanceFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  const fieldErrors = validateAttendanceForm(parsed.values);
  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors, message: "入力内容を確認してください。", success: false };
  }

  const ownershipError = await assertSubjectOwned(parsed.values.subjectId);
  if (ownershipError) {
    return toFailure(ownershipError);
  }

  const result = await saveAttendanceRecord({
    subjectId: parsed.values.subjectId,
    classDate: parsed.values.classDate,
    status: parsed.values.status,
    // 空のメモは「未記入」としてNULLで保存する。
    memo: parsed.values.memo.trim() === "" ? null : parsed.values.memo.trim(),
  });

  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateAttendanceViews(parsed.values.subjectId);

  return { fieldErrors: {}, message: null, success: true };
}

/**
 * 出席記録を削除する。
 * 他ユーザーの記録IDを指定した場合はクエリ側で not_found になる。
 */
export async function deleteAttendanceAction(
  _prevState: AttendanceFormState,
  formData: FormData,
): Promise<AttendanceFormState> {
  const parsed = parseDeleteAttendanceFormData(formData);
  if (!parsed.ok) {
    return toFailure("送信内容を読み取れませんでした。画面を再読み込みしてください。");
  }

  if (parsed.recordId.trim() === "") {
    return toFailure("削除対象の記録が指定されていません。");
  }

  const result = await deleteAttendanceRecord(parsed.recordId);

  if (!result.ok) {
    return toFailure(ERROR_MESSAGES[result.error]);
  }

  revalidateAttendanceViews(parsed.subjectId);

  return { fieldErrors: {}, message: null, success: true };
}
