/** 点数記録フォームで扱う入力値。 */
export interface TestRecordFormValues {
  subjectId: string;
  gradeItemId: string;
  recordId: string;
  score: string;
  recordedAt: string;
  memo: string;
}

export type TestRecordFormErrors = Record<string, string>;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** YYYY-MM-DD形式かつ実在する日付かを確認する。 */
export function isValidRecordedAt(value: string): boolean {
  if (!DATE_PATTERN.test(value)) {
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

/** 点数が小数第2位までの数値かを確認する。 */
export function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < Number.EPSILON;
}

/** DBアクセス前に、フォームから分かる点数記録の入力不正を検出する。 */
export function validateTestRecordForm(values: TestRecordFormValues): TestRecordFormErrors {
  const errors: TestRecordFormErrors = {};
  const score = Number(values.score);

  if (values.subjectId.trim() === "") {
    errors.subjectId = "科目が指定されていません。";
  }

  if (values.gradeItemId.trim() === "") {
    errors.gradeItemId = "評価項目を選択してください。";
  }

  if (values.score.trim() === "") {
    errors.score = "点数を入力してください。";
  } else if (!Number.isFinite(score) || score < 0 || !hasAtMostTwoDecimalPlaces(score)) {
    errors.score = "点数は0以上の数値を小数第2位までで入力してください。";
  }

  if (values.recordedAt.trim() === "") {
    errors.recordedAt = "記録日を入力してください。";
  } else if (!isValidRecordedAt(values.recordedAt)) {
    errors.recordedAt = "記録日はYYYY-MM-DD形式の実在する日付で入力してください。";
  }

  return errors;
}
