import {
  MAX_SCORE,
  type SubjectFormGradeItemValue,
  type SubjectFormValues,
} from "@/components/subjects/subjectFormValidation";
import type { GradeItemCategory } from "@/lib/types/domain";
import type {
  ExtractedField,
  ExtractedGradeItem,
  ExtractedSubjectDraft,
  FieldNote,
  SubjectImportDraft,
  SubjectImportError,
} from "./types";
import { verifyField } from "./validateEvidence";

export type NormalizeExtractionResult =
  | { ok: true; draft: SubjectImportDraft }
  | { ok: false; error: Extract<SubjectImportError, "multiple_subjects"> };

/** 総授業回数として現実的に受け入れる上限。 */
const MAX_TOTAL_CLASS_COUNT = 1000;
const MAX_SUBJECT_NAME_LENGTH = 100;
const MAX_GRADE_ITEM_NAME_LENGTH = 100;
const MAX_GRADE_LABEL_LENGTH = 50;
/** 出席率と最大欠席数の矛盾を警告する閾値（パーセントポイント）。 */
const ATTENDANCE_CONFLICT_TOLERANCE = 5;
const DEFAULT_MAX_SCORE = "100";

const CATEGORIES: GradeItemCategory[] = ["attendance", "assignment", "test", "other"];

/** DBのnumeric(5,2)に合わせ、小数第2位までへ丸める。 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 値を落としたうえで「要確認」に倒す。 */
function toAmbiguous<T>(): ExtractedField<T> {
  return { value: null, status: "ambiguous", evidence: null };
}

function toNote(field: ExtractedField<unknown>, note: string | null = null): FieldNote {
  return { status: field.status, evidence: field.evidence, note };
}

/** 数値項目を範囲で検証する。範囲外は値を捨てて ambiguous にする。 */
function verifyNumber(
  field: ExtractedField<number>,
  options: { min: number; max: number; integer?: boolean },
): ExtractedField<number> {
  if (field.value === null) {
    return field;
  }

  if (!Number.isFinite(field.value)) {
    return toAmbiguous();
  }

  if (options.integer === true && !Number.isInteger(field.value)) {
    return toAmbiguous();
  }

  if (field.value < options.min || field.value > options.max) {
    return toAmbiguous();
  }

  return field;
}

/** 文字列項目を整形する。空文字になったものは値なし扱いにする。 */
function verifyString(
  field: ExtractedField<string>,
  maxLength: number,
): ExtractedField<string> {
  if (field.value === null) {
    return field;
  }

  const trimmed = field.value.trim();
  if (trimmed === "") {
    return toAmbiguous();
  }

  return { ...field, value: trimmed.slice(0, maxLength) };
}

/** 数値をフォーム用の文字列にする。値がなければ空文字。 */
function toFormNumber(field: ExtractedField<number>): string {
  return field.value === null ? "" : String(field.value);
}

function toFormString(field: ExtractedField<string>): string {
  return field.value ?? "";
}

interface NormalizedGradeItem {
  values: SubjectFormGradeItemValue;
  notes: Record<string, FieldNote>;
}

/** 評価項目1件を検証し、フォーム用の値とメモへ変換する。 */
function normalizeGradeItem(
  item: ExtractedGradeItem,
  index: number,
  normalizedInput: string,
): NormalizedGradeItem {
  const name = verifyString(verifyField(item.name, normalizedInput), MAX_GRADE_ITEM_NAME_LENGTH);
  const weight = verifyNumber(verifyField(item.weight, normalizedInput), { min: 0, max: 100 });

  const verifiedCategory = verifyField(item.category, normalizedInput);
  const category: ExtractedField<GradeItemCategory> =
    verifiedCategory.value !== null && CATEGORIES.includes(verifiedCategory.value)
      ? verifiedCategory
      : { value: null, status: "ambiguous", evidence: null };

  const verifiedMaxScore = verifyNumber(verifyField(item.maxScore, normalizedInput), {
    min: 0.01,
    max: MAX_SCORE,
  });
  // 満点は記載されないことが多いため、100点満点を仮設定として補う。
  const maxScoreValue = verifiedMaxScore.value;

  return {
    values: {
      id: `grade-item-${index}`,
      name: toFormString(name),
      category: category.value ?? "other",
      weight: weight.value === null ? "" : String(roundToTwoDecimals(weight.value)),
      maxScore:
        maxScoreValue === null ? DEFAULT_MAX_SCORE : String(roundToTwoDecimals(maxScoreValue)),
    },
    notes: {
      [`gradeItems.${index}.name`]: toNote(name),
      [`gradeItems.${index}.category`]: toNote(
        category,
        category.value === null ? "種類を確認してください。" : null,
      ),
      [`gradeItems.${index}.weight`]: toNote(weight),
      [`gradeItems.${index}.maxScore`]:
        maxScoreValue === null
          ? { status: "derived", evidence: null, note: "100点満点として仮設定しました。" }
          : toNote(verifiedMaxScore),
    },
  };
}

/** 空の評価項目を1件だけ用意する。SubjectFormの初期行と同じ形にする。 */
function createPlaceholderGradeItem(): SubjectFormGradeItemValue {
  return {
    id: "grade-item-0",
    name: "",
    category: "test",
    weight: "",
    maxScore: DEFAULT_MAX_SCORE,
  };
}

/**
 * AIの抽出結果を検証し、SubjectFormへ渡せる下書きへ変換する。
 * 根拠の実在確認 → 数値・カテゴリの範囲検証 → 項目間の整合性 の順に確認し、
 * 確認できなかった値はフォームへ通さない。計算や補完は一切行わない。
 */
export function normalizeExtraction(
  raw: ExtractedSubjectDraft,
  normalizedInput: string,
): NormalizeExtractionResult {
  // 複数科目はMVPの対象外。分割せずに入力し直してもらう。
  if (raw.detectedSubjectCount > 1) {
    return { ok: false, error: "multiple_subjects" };
  }

  const warnings: string[] = [];

  const name = verifyString(verifyField(raw.subjectName, normalizedInput), MAX_SUBJECT_NAME_LENGTH);
  // 総授業回数は必須項目だが、記載がなければ推測せず空のままにする。
  const totalClassCount = verifyNumber(verifyField(raw.totalClassCount, normalizedInput), {
    min: 1,
    max: MAX_TOTAL_CLASS_COUNT,
    integer: true,
  });
  const rawRequiredRate = verifyField(raw.attendanceRequiredRate, normalizedInput);
  const attendanceRequiredRate = verifyNumber(
    rawRequiredRate.value === null
      ? rawRequiredRate
      : { ...rawRequiredRate, value: roundToTwoDecimals(clamp(rawRequiredRate.value, 0, 100)) },
    { min: 0, max: 100 },
  );
  let attendanceMaxAbsences = verifyNumber(verifyField(raw.attendanceMaxAbsences, normalizedInput), {
    min: 0,
    max: MAX_TOTAL_CLASS_COUNT,
    integer: true,
  });
  const targetGradeLabel = verifyString(
    verifyField(raw.targetGradeLabel, normalizedInput),
    MAX_GRADE_LABEL_LENGTH,
  );
  const rawTargetScore = verifyField(raw.targetScore, normalizedInput);
  const targetScore = verifyNumber(
    rawTargetScore.value === null
      ? rawTargetScore
      : { ...rawTargetScore, value: roundToTwoDecimals(clamp(rawTargetScore.value, 0, 100)) },
    { min: 0, max: 100 },
  );
  const attendanceAffectsGrade = verifyField(raw.attendanceAffectsGrade, normalizedInput);

  const normalizedItems = raw.gradeItems
    .map((item, index) => normalizeGradeItem(item, index, normalizedInput))
    // 名前も割合も取れなかった行は、残しても手掛かりにならないため落とす。
    .filter((item) => item.values.name !== "" || item.values.weight !== "");

  // 落とした行があると添字がずれるので、キーと行IDを振り直す。
  const gradeItems = normalizedItems.map((item, index) => ({
    ...item.values,
    id: `grade-item-${index}`,
  }));
  const gradeItemNotes: Record<string, FieldNote> = {};
  normalizedItems.forEach((item, index) => {
    for (const [key, note] of Object.entries(item.notes)) {
      gradeItemNotes[key.replace(/^gradeItems\.\d+\./u, `gradeItems.${index}.`)] = note;
    }
  });

  // 最大欠席数が総授業回数を超える組み合わせは保存できないため、欠席数の方を捨てる。
  if (
    totalClassCount.value !== null &&
    attendanceMaxAbsences.value !== null &&
    attendanceMaxAbsences.value > totalClassCount.value
  ) {
    attendanceMaxAbsences = toAmbiguous();
    warnings.push("最大欠席数が総授業回数を超えていたため、値を空にしました。");
  }

  // 出席率と最大欠席数が食い違う場合は、どちらが正しいか推測せず両方残して注意を促す。
  if (
    totalClassCount.value !== null &&
    totalClassCount.value > 0 &&
    attendanceRequiredRate.value !== null &&
    attendanceMaxAbsences.value !== null
  ) {
    const impliedRate =
      ((totalClassCount.value - attendanceMaxAbsences.value) / totalClassCount.value) * 100;

    if (Math.abs(impliedRate - attendanceRequiredRate.value) > ATTENDANCE_CONFLICT_TOLERANCE) {
      warnings.push("必要出席率と最大欠席数が一致しません。どちらが正しいか確認してください。");
    }
  }

  // 出席の評価項目に配点があるなら、出席は成績へ影響する。これは決定的に判断できる。
  const hasWeightedAttendanceItem = gradeItems.some(
    (item) => item.category === "attendance" && Number(item.weight) > 0,
  );
  const affectsGradeValue = hasWeightedAttendanceItem || attendanceAffectsGrade.value === true;

  const weightTotal = gradeItems.reduce((total, item) => {
    const weight = Number(item.weight);
    return Number.isFinite(weight) && item.weight !== "" ? total + weight : total;
  }, 0);

  // 合計が100%でなくても、不足分を自動で補わずに利用者へ判断を委ねる。
  if (gradeItems.length > 0 && Math.abs(weightTotal - 100) > 0.001) {
    warnings.push(
      `評価割合の合計が${roundToTwoDecimals(weightTotal)}%です。100%になるよう確認してください。`,
    );
  }

  if (gradeItems.length === 0) {
    warnings.push("評価項目を読み取れませんでした。手動で追加してください。");
  }

  const values: SubjectFormValues = {
    name: toFormString(name),
    totalClassCount: toFormNumber(totalClassCount),
    attendanceRequiredRate: toFormNumber(attendanceRequiredRate),
    attendanceMaxAbsences: toFormNumber(attendanceMaxAbsences),
    attendanceAffectsGrade: affectsGradeValue,
    targetGradeLabel: toFormString(targetGradeLabel),
    targetScore: toFormNumber(targetScore),
    gradeItems: gradeItems.length > 0 ? gradeItems : [createPlaceholderGradeItem()],
  };

  const notes: Record<string, FieldNote> = {
    name: toNote(name),
    totalClassCount: toNote(
      totalClassCount,
      totalClassCount.value === null ? "総授業回数は必須です。入力してください。" : null,
    ),
    attendanceRequiredRate: toNote(attendanceRequiredRate),
    attendanceMaxAbsences: toNote(attendanceMaxAbsences),
    attendanceAffectsGrade: hasWeightedAttendanceItem
      ? { status: "derived", evidence: null, note: "出席の配点があるため有効にしました。" }
      : toNote(attendanceAffectsGrade),
    targetGradeLabel: toNote(targetGradeLabel),
    targetScore: toNote(targetScore),
    ...gradeItemNotes,
  };

  return { ok: true, draft: { values, notes, warnings } };
}
