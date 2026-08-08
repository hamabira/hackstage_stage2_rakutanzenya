import type { TestRecordFormErrors } from "@/lib/grades/testRecordFormValidation";

/**
 * 得点記録Actionの結果。useActionState の state として扱う。
 * fieldErrors はフィールド名をキーにしたエラー文、
 * message はフォーム全体に対するエラー文(未認証・権限エラーなど)。
 */
export interface TestRecordFormState {
  fieldErrors: TestRecordFormErrors;
  message: string | null;
  success: boolean;
}

export const initialTestRecordFormState: TestRecordFormState = {
  fieldErrors: {},
  message: null,
  success: false,
};
