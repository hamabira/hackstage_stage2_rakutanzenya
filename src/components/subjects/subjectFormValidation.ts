import type { GradeItemCategory } from "@/lib/types/domain";

export const MAX_SCORE = 9999.99;
const WEIGHT_TOTAL = 100;
const WEIGHT_TOLERANCE = 0.000001;

export interface SubjectFormGradeItemValue {
  /** フォーム内で行を識別するためのキー。DBのIDではない。 */
  id: string;
  /** 保存済み評価項目のDB上のID。新規追加の行では未設定。 */
  persistedId?: string;
  name: string;
  category: GradeItemCategory;
  weight: string;
  maxScore: string;
}

export interface SubjectFormValues {
  name: string;
  totalClassCount: string;
  attendanceRequiredRate: string;
  attendanceMaxAbsences: string;
  attendanceAffectsGrade: boolean;
  targetGradeLabel: string;
  targetScore: string;
  gradeItems: SubjectFormGradeItemValue[];
}

export type SubjectFormErrors = Record<string, string>;

/** 整数の入力値が指定された範囲内かを確認する。 */
function isIntegerInRange(value: string, min: number, max?: number): boolean {
  const parsed = Number(value);
  return (
    value.trim() !== "" &&
    Number.isInteger(parsed) &&
    parsed >= min &&
    (max === undefined || parsed <= max)
  );
}

/** 小数を含む数値の入力値が指定された範囲内かを確認する。 */
function isNumberInRange(value: string, min: number, max: number): boolean {
  const parsed = Number(value);
  return (
    value.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= min &&
    parsed <= max
  );
}

/** 評価項目ごとの評価割合を合計する。 */
export function getGradeItemsWeightTotal(
  gradeItems: SubjectFormGradeItemValue[],
): number {
  return gradeItems.reduce((total, item) => {
    const weight = Number(item.weight);
    return Number.isFinite(weight) ? total + weight : total;
  }, 0);
}

/** 評価項目があり、評価割合の合計が100%かを確認する。 */
export function isGradeItemsWeightTotalValid(
  gradeItems: SubjectFormGradeItemValue[],
): boolean {
  return (
    gradeItems.length > 0 &&
    gradeItems.every((item) => isNumberInRange(item.weight, 0, WEIGHT_TOTAL)) &&
    Math.abs(getGradeItemsWeightTotal(gradeItems) - WEIGHT_TOTAL) < WEIGHT_TOLERANCE
  );
}

/** フォーム全体を検証し、フィールド名をキーにしたエラー文を返す。 */
export function validateSubjectForm(values: SubjectFormValues): SubjectFormErrors {
  const errors: SubjectFormErrors = {};
  const totalClassCount = Number(values.totalClassCount);

  if (values.name.trim() === "") {
    errors.name = "科目名を入力してください。";
  }

  if (!isIntegerInRange(values.totalClassCount, 1)) {
    errors.totalClassCount = "総授業回数は1以上の整数で入力してください。";
  }

  if (
    values.attendanceRequiredRate.trim() !== "" &&
    !isNumberInRange(values.attendanceRequiredRate, 0, 100)
  ) {
    errors.attendanceRequiredRate = "必要出席率は0〜100で入力してください。";
  }

  if (
    values.attendanceMaxAbsences.trim() !== "" &&
    !isIntegerInRange(values.attendanceMaxAbsences, 0, totalClassCount)
  ) {
    errors.attendanceMaxAbsences =
      "最大欠席数は0以上かつ総授業回数以下の整数で入力してください。";
  }

  if (
    values.targetScore.trim() !== "" &&
    !isNumberInRange(values.targetScore, 0, 100)
  ) {
    errors.targetScore = "目標点数は0〜100で入力してください。";
  }

  if (values.gradeItems.length === 0) {
    errors.gradeItems = "評価項目を1件以上追加してください。";
  }

  values.gradeItems.forEach((item, index) => {
    const fieldPrefix = `gradeItems.${index}`;

    if (item.name.trim() === "") {
      errors[`${fieldPrefix}.name`] = "評価項目名を入力してください。";
    }

    if (!isNumberInRange(item.weight, 0, WEIGHT_TOTAL)) {
      errors[`${fieldPrefix}.weight`] = "評価割合は0〜100で入力してください。";
    }

    if (!isNumberInRange(item.maxScore, 0.01, MAX_SCORE)) {
      errors[`${fieldPrefix}.maxScore`] =
        `満点は0.01〜${MAX_SCORE}で入力してください。`;
    }
  });

  if (values.gradeItems.length > 0 && !isGradeItemsWeightTotalValid(values.gradeItems)) {
    errors.gradeItems = "評価割合の合計を100%にしてください。";
  }

  return errors;
}
