import type { TestRecordFormErrors } from "@/lib/grades/testRecordFormValidation";

/** 点数記録Actionがフォームへ返す状態。 */
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
