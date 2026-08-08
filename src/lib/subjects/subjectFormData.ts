import type {
  SubjectFormGradeItemValue,
  SubjectFormValues,
} from "@/components/subjects/subjectFormValidation";
import type { GradeItemCategory } from "@/lib/types/domain";

/** SubjectForm が出力する評価項目のフィールド名。例: gradeItems[0][name] */
const GRADE_ITEM_FIELD_PATTERN = /^gradeItems\[(\d+)\]\[(\w+)\]$/;

const GRADE_ITEM_CATEGORIES: readonly GradeItemCategory[] = [
  "attendance",
  "assignment",
  "test",
  "other",
];

/** 値の妥当性ではなく、FormDataの形式そのものが壊れている場合の理由。 */
export type SubjectFormDataError =
  | "invalid_field_type"
  | "invalid_grade_item_category";

export type ParseSubjectFormDataResult =
  | { ok: true; values: SubjectFormValues }
  | { ok: false; error: SubjectFormDataError };

/**
 * 文字列フィールドを取り出す。未送信は空文字として扱い、
 * ファイルなど文字列でない値が入っていた場合だけ失敗させる。
 */
function getStringField(formData: FormData, name: string): string | null {
  const value = formData.get(name);

  if (value === null) {
    return "";
  }

  return typeof value === "string" ? value : null;
}

function isGradeItemCategory(value: string): value is GradeItemCategory {
  return (GRADE_ITEM_CATEGORIES as readonly string[]).includes(value);
}

/**
 * 評価項目のフィールドを添字ごとにまとめる。
 * 添字はフォーム上の表示順を表すため、昇順に並べ直して配列にする。
 */
function collectGradeItems(
  formData: FormData,
): Map<number, Record<string, string>> | null {
  const itemsByIndex = new Map<number, Record<string, string>>();

  for (const [key, value] of formData.entries()) {
    const matched = GRADE_ITEM_FIELD_PATTERN.exec(key);
    if (!matched) {
      continue;
    }

    if (typeof value !== "string") {
      return null;
    }

    const index = Number(matched[1]);
    const field = matched[2];
    const item = itemsByIndex.get(index) ?? {};
    item[field] = value;
    itemsByIndex.set(index, item);
  }

  return itemsByIndex;
}

/**
 * FormDataをフォーム入力値の形へ変換する。
 * ここでは値の妥当性は判定せず、型として扱える形に整えることだけを行う。
 * 検証は validateSubjectForm が担当する。
 */
export function parseSubjectFormData(
  formData: FormData,
): ParseSubjectFormDataResult {
  const name = getStringField(formData, "name");
  const totalClassCount = getStringField(formData, "totalClassCount");
  const attendanceRequiredRate = getStringField(formData, "attendanceRequiredRate");
  const attendanceMaxAbsences = getStringField(formData, "attendanceMaxAbsences");
  const targetGradeLabel = getStringField(formData, "targetGradeLabel");
  const targetScore = getStringField(formData, "targetScore");

  if (
    name === null ||
    totalClassCount === null ||
    attendanceRequiredRate === null ||
    attendanceMaxAbsences === null ||
    targetGradeLabel === null ||
    targetScore === null
  ) {
    return { ok: false, error: "invalid_field_type" };
  }

  const itemsByIndex = collectGradeItems(formData);
  if (itemsByIndex === null) {
    return { ok: false, error: "invalid_field_type" };
  }

  const gradeItems: SubjectFormGradeItemValue[] = [];

  for (const index of [...itemsByIndex.keys()].sort((a, b) => a - b)) {
    const item = itemsByIndex.get(index) ?? {};
    const category = item.category ?? "";

    // カテゴリはselectの選択肢に限られる。想定外の値は改ざんとみなす。
    if (!isGradeItemCategory(category)) {
      return { ok: false, error: "invalid_grade_item_category" };
    }

    gradeItems.push({
      id: `grade-item-${index}`,
      name: item.name ?? "",
      category,
      weight: item.weight ?? "",
      maxScore: item.maxScore ?? "",
    });
  }

  return {
    ok: true,
    values: {
      name,
      totalClassCount,
      attendanceRequiredRate,
      attendanceMaxAbsences,
      // 未チェックのcheckboxはFormDataに現れないため、存在の有無で判定する。
      attendanceAffectsGrade: formData.get("attendanceAffectsGrade") !== null,
      targetGradeLabel,
      targetScore,
      gradeItems,
    },
  };
}
