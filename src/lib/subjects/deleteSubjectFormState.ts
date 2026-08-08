/** 科目削除Actionが削除フォームへ返す状態。 */
export interface DeleteSubjectFormState {
  message: string | null;
}

export const initialDeleteSubjectFormState: DeleteSubjectFormState = {
  message: null,
};
