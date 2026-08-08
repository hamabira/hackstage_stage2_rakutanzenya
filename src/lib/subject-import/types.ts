import type { SubjectFormValues } from "@/components/subjects/subjectFormValidation";
import type { GradeItemCategory } from "@/lib/types/domain";

/**
 * 抽出結果の確からしさ。
 * explicit: 入力文に明記されている
 * derived: 明記情報から決定的に算出した
 * missing: 記載がない
 * ambiguous: 複数の解釈があり一意に決められない
 */
export type ExtractionStatus = "explicit" | "derived" | "missing" | "ambiguous";

/** AIが返す1項目分の抽出結果。evidenceは原文からの逐語引用。 */
export interface ExtractedField<T> {
  value: T | null;
  status: ExtractionStatus;
  evidence: string | null;
}

export interface ExtractedGradeItem {
  name: ExtractedField<string>;
  category: ExtractedField<GradeItemCategory>;
  weight: ExtractedField<number>;
  maxScore: ExtractedField<number>;
}

/** AIの構造化出力そのもの。この時点では値を信用していない。 */
export interface ExtractedSubjectDraft {
  subjectName: ExtractedField<string>;
  totalClassCount: ExtractedField<number>;
  attendanceRequiredRate: ExtractedField<number>;
  attendanceMaxAbsences: ExtractedField<number>;
  attendanceAffectsGrade: ExtractedField<boolean>;
  targetGradeLabel: ExtractedField<string>;
  targetScore: ExtractedField<number>;
  gradeItems: ExtractedGradeItem[];
  detectedSubjectCount: number;
}

/** 正規化後、UIが項目ごとの状態を表示するためのメタ情報。 */
export interface FieldNote {
  status: ExtractionStatus;
  evidence: string | null;
  /** 「100点満点として仮設定」など、利用者へ出す補足。 */
  note: string | null;
}

/**
 * 正規化の出力。valuesはそのまま SubjectForm へ渡せる状態になっている。
 * notesのキーは SubjectFormErrors と同じ規則（例: "name", "gradeItems.0.weight"）。
 */
export interface SubjectImportDraft {
  values: SubjectFormValues;
  notes: Record<string, FieldNote>;
  warnings: string[];
}

export type SubjectImportError =
  | "unauthenticated"
  | "empty_input"
  | "too_long"
  | "multiple_subjects"
  /** 2回とも構造化出力がスキーマに適合しなかった。 */
  | "invalid_response"
  | "timeout"
  | "provider_error"
  /** APIキーが未設定。 */
  | "not_configured"
  | "unknown";
