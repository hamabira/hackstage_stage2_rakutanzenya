import type { AttendanceFormErrors } from "@/lib/attendance/attendanceFormValidation";

/**
 * 出席記録Actionの結果。useActionState の state として扱う。
 * fieldErrors はフィールド名をキーにしたエラー文、
 * message はフォーム全体に対するエラー文(未認証・権限エラーなど)。
 */
export interface AttendanceFormState {
  fieldErrors: AttendanceFormErrors;
  message: string | null;
  success: boolean;
}

export const initialAttendanceFormState: AttendanceFormState = {
  fieldErrors: {},
  message: null,
  success: false,
};
