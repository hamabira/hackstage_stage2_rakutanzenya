import type { SubjectFormValues } from "@/components/subjects/subjectFormValidation";
import type { GradeItemCategory } from "@/lib/types/domain";

export interface CreateGradeItemInput {
  name: string;
  category: GradeItemCategory;
  weight: number;
  maxScore: number | null;
  sortOrder: number;
}

export interface CreateSubjectInput {
  name: string;
  totalClassCount: number;
  attendanceRequiredRate: number | null;
  attendanceMaxAbsences: number | null;
  attendanceAffectsGrade: boolean;
  targetGradeLabel: string | null;
  targetScore: number | null;
  gradeItems: CreateGradeItemInput[];
}

/** 空欄は「未設定」としてNULLで保存する。 */
function toNullableNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

/** 空欄は「未設定」としてNULLで保存する。 */
function toNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * 検証済みのフォーム入力値を、保存に使う数値・真偽値へ変換する。
 * 呼び出し前に validateSubjectForm を通していることを前提とする。
 * 評価項目の表示順は配列順をそのまま sortOrder として採番する。
 */
export function toCreateSubjectInput(values: SubjectFormValues): CreateSubjectInput {
  return {
    name: values.name.trim(),
    totalClassCount: Number(values.totalClassCount),
    attendanceRequiredRate: toNullableNumber(values.attendanceRequiredRate),
    attendanceMaxAbsences: toNullableNumber(values.attendanceMaxAbsences),
    attendanceAffectsGrade: values.attendanceAffectsGrade,
    targetGradeLabel: toNullableText(values.targetGradeLabel),
    targetScore: toNullableNumber(values.targetScore),
    gradeItems: values.gradeItems.map((item, index) => ({
      name: item.name.trim(),
      category: item.category,
      weight: Number(item.weight),
      maxScore: toNullableNumber(item.maxScore),
      sortOrder: index,
    })),
  };
}
