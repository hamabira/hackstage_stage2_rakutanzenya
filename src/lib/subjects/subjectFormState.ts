import type { SubjectFormErrors } from "@/components/subjects/subjectFormValidation";

/**
 * 科目登録Actionの結果。useActionState の state として扱う。
 * fieldErrors はフォームのフィールド名をキーにしたエラー文、
 * message はフォーム全体に対するエラー文(未認証・保存失敗など)。
 */
export interface SubjectFormState {
  fieldErrors: SubjectFormErrors;
  message: string | null;
}

export const initialSubjectFormState: SubjectFormState = {
  fieldErrors: {},
  message: null,
};
