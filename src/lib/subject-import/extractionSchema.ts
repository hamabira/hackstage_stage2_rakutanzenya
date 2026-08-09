import type { ExtractedField, ExtractedSubjectDraft, ExtractionStatus } from "./types";

const STATUS_VALUES = ["explicit", "derived", "missing", "ambiguous"] as const;
const CATEGORY_VALUES = ["attendance", "assignment", "test", "other"] as const;

/** 1回の解析で受け付ける評価項目の上限。 */
export const MAX_GRADE_ITEMS = 20;

type ValueType = "STRING" | "NUMBER" | "INTEGER" | "BOOLEAN";

/**
 * ExtractedField<T> 相当のスキーマを組み立てる。
 * Geminiのスキーマは $ref を解決しないため、項目ごとに展開する。
 */
function extractedField(valueType: ValueType, description: string, valueEnum?: readonly string[]) {
  return {
    type: "OBJECT",
    description,
    properties: {
      // nullable を付けないと、値が無いときに null ではなく "" や 0 が返る。
      value: {
        type: valueType,
        nullable: true,
        ...(valueEnum === undefined ? {} : { enum: [...valueEnum] }),
      },
      status: { type: "STRING", enum: [...STATUS_VALUES] },
      evidence: {
        type: "STRING",
        nullable: true,
        description: "原文からの逐語引用。推測や言い換えは禁止。",
      },
    },
    required: ["value", "status", "evidence"],
    // 逐次生成のため、値→根拠の順で並べると適合率が上がる。
    propertyOrdering: ["value", "status", "evidence"],
  };
}

/**
 * Geminiのresponse_schema。
 * 数値の範囲（minimum/maximum）はGeminiが解釈しないため、normalizeExtractionで担保する。
 */
export const EXTRACTION_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    subjectName: extractedField("STRING", "科目名。"),
    totalClassCount: extractedField(
      "INTEGER",
      "総授業回数。記載がなければ value を null、status を missing にする。15回などの一般的な回数を推測してはいけない。",
    ),
    attendanceRequiredRate: extractedField(
      "NUMBER",
      "単位取得に必要な出席率(%)。成績評価に占める出席点の割合とは別物なので混同しない。",
    ),
    attendanceMaxAbsences: extractedField(
      "INTEGER",
      "許容される最大欠席回数。「3回欠席したら失格」は2、「3回を超えて欠席すると失格」は3。",
    ),
    attendanceAffectsGrade: extractedField("BOOLEAN", "出席点が成績評価の割合に含まれるか。"),
    targetGradeLabel: extractedField("STRING", "目標成績の表示名（例: A、優）。"),
    targetScore: extractedField(
      "NUMBER",
      "目標点数(0〜100)。成績ラベルから点数を推測してはいけない。",
    ),
    gradeItems: {
      type: "ARRAY",
      // maxItems はこのAPIが400を返すため指定しない。件数の上限は
      // isExtractedSubjectDraft がMAX_GRADE_ITEMSで確認する。
      description: `評価項目。入力文に現れる順に並べる。最大${MAX_GRADE_ITEMS}件。`,
      items: {
        type: "OBJECT",
        properties: {
          name: extractedField("STRING", "評価項目名。"),
          category: extractedField(
            "STRING",
            "評価の種類。「平常点」だけの記載は出席と断定せず other か ambiguous にする。",
            CATEGORY_VALUES,
          ),
          weight: extractedField(
            "NUMBER",
            "評価割合(%)。「20〜30%」のような範囲表現は ambiguous にする。",
          ),
          maxScore: extractedField(
            "NUMBER",
            "満点。記載がなければ 100 を value にし status を derived にする。",
          ),
        },
        required: ["name", "category", "weight", "maxScore"],
        propertyOrdering: ["name", "category", "weight", "maxScore"],
      },
    },
    detectedSubjectCount: {
      type: "INTEGER",
      description:
        "入力文に含まれる科目の数。科目名が複数あり、それぞれに独立した授業回数や評価構成が書かれていれば2以上にする。1科目内の中間・期末などは評価項目であって科目ではない。",
    },
  },
  required: [
    "subjectName",
    "totalClassCount",
    "attendanceRequiredRate",
    "attendanceMaxAbsences",
    "attendanceAffectsGrade",
    "targetGradeLabel",
    "targetScore",
    "gradeItems",
    "detectedSubjectCount",
  ],
  propertyOrdering: [
    "subjectName",
    "totalClassCount",
    "attendanceRequiredRate",
    "attendanceMaxAbsences",
    "attendanceAffectsGrade",
    "targetGradeLabel",
    "targetScore",
    "gradeItems",
    "detectedSubjectCount",
  ],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExtractionStatus(value: unknown): value is ExtractionStatus {
  return STATUS_VALUES.includes(value as ExtractionStatus);
}

/** value の型だけを検査する。範囲や意味の妥当性は normalizeExtraction が見る。 */
function isExtractedField(value: unknown, valueType: "string" | "number" | "boolean"): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (!isExtractionStatus(value.status)) {
    return false;
  }

  if (value.evidence !== null && typeof value.evidence !== "string") {
    return false;
  }

  if (value.value === null) {
    return true;
  }

  if (valueType === "number") {
    return typeof value.value === "number" && Number.isFinite(value.value);
  }

  return typeof value.value === valueType;
}

function isExtractedGradeItem(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isExtractedField(value.name, "string") &&
    isExtractedField(value.category, "string") &&
    isExtractedField(value.weight, "number") &&
    isExtractedField(value.maxScore, "number")
  );
}

/**
 * JSON.parse 済みの値が ExtractedSubjectDraft の形をしているかを判定する。
 * ここを通らなかった応答は再試行の対象になる。
 */
export function isExtractedSubjectDraft(value: unknown): value is ExtractedSubjectDraft {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isExtractedField(value.subjectName, "string") ||
    !isExtractedField(value.totalClassCount, "number") ||
    !isExtractedField(value.attendanceRequiredRate, "number") ||
    !isExtractedField(value.attendanceMaxAbsences, "number") ||
    !isExtractedField(value.attendanceAffectsGrade, "boolean") ||
    !isExtractedField(value.targetGradeLabel, "string") ||
    !isExtractedField(value.targetScore, "number")
  ) {
    return false;
  }

  if (
    typeof value.detectedSubjectCount !== "number" ||
    !Number.isInteger(value.detectedSubjectCount) ||
    value.detectedSubjectCount < 0
  ) {
    return false;
  }

  if (!Array.isArray(value.gradeItems) || value.gradeItems.length > MAX_GRADE_ITEMS) {
    return false;
  }

  return value.gradeItems.every(isExtractedGradeItem);
}

/** テストから参照するための再エクスポート。 */
export type { ExtractedField };
