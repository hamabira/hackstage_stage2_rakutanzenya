/** メモの最大文字数。DB側は text 型で無制限のため、アプリ側の方針として決める。 */
export const MEMO_MAX_LENGTH = 500;

/** DBの numeric(6,2) に収まる得点の上限。 */
export const MAX_SCORE = 9999.99;

export interface TestRecordFormValues {
  /** 更新対象の記録ID。新規登録では空文字。 */
  recordId: string;
  gradeItemId: string;
  score: string;
  /** YYYY-MM-DD 形式の実施日。 */
  recordedAt: string;
  memo: string;
}

export type TestRecordFormErrors = Record<string, string>;

const RECORDED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * YYYY-MM-DD が実在する日付かを確認する。
 * 2026-02-30 のような書式は正しいが存在しない日付を弾く。
 */
export function isValidRecordedAt(value: string): boolean {
  if (!RECORDED_AT_PATTERN.test(value)) {
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

/**
 * 得点記録の入力値を検証する。
 * maxScore を渡すと満点超過も検出する。満点は評価項目ごとに異なるため、
 * 呼び出し側が選択中の評価項目の値を渡す。
 */
export function validateTestRecordForm(
  values: TestRecordFormValues,
  maxScore: number | null,
): TestRecordFormErrors {
  const errors: TestRecordFormErrors = {};

  if (values.gradeItemId.trim() === "") {
    errors.gradeItemId = "評価項目を選択してください。";
  }

  const score = Number(values.score);

  if (values.score.trim() === "") {
    errors.score = "得点を入力してください。";
  } else if (!Number.isFinite(score)) {
    errors.score = "得点は数値で入力してください。";
  } else if (score < 0) {
    errors.score = "得点は0以上で入力してください。";
  } else if (score > MAX_SCORE) {
    errors.score = `得点は${MAX_SCORE}以下で入力してください。`;
  } else if (maxScore !== null && score > maxScore) {
    errors.score = `得点は満点(${maxScore})以下で入力してください。`;
  }

  if (values.recordedAt.trim() === "") {
    errors.recordedAt = "実施日を入力してください。";
  } else if (!isValidRecordedAt(values.recordedAt)) {
    errors.recordedAt = "実施日はYYYY-MM-DD形式の実在する日付で入力してください。";
  }

  if (values.memo.length > MEMO_MAX_LENGTH) {
    errors.memo = `メモは${MEMO_MAX_LENGTH}文字以内で入力してください。`;
  }

  return errors;
}
