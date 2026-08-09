"use client";

import type { ExtractionStatus, FieldNote, SubjectImportDraft } from "@/lib/subject-import/types";

interface SubjectImportResultProps {
  notes: SubjectImportDraft["notes"];
  warnings: string[];
}

/** 色だけに頼らず、状態を必ず文字でも示す。 */
const STATUS_LABELS: Record<ExtractionStatus, string> = {
  explicit: "明記あり",
  derived: "仮設定・算出",
  missing: "記載なし",
  ambiguous: "要確認",
};

const STATUS_CLASSES: Record<ExtractionStatus, string> = {
  explicit: "bg-[#eaf7e4] text-[#337a24]",
  derived: "bg-[#fdf3dd] text-[#8a6414]",
  missing: "bg-[#f0f1ed] text-[#697067]",
  ambiguous: "bg-[#fdeaea] text-[#a32b2b]",
};

/** notesのキーを画面に出す項目名へ変換する。 */
const FIELD_LABELS: Record<string, string> = {
  name: "科目名",
  totalClassCount: "総授業回数",
  attendanceRequiredRate: "必要出席率",
  attendanceMaxAbsences: "最大欠席数",
  attendanceAffectsGrade: "出席を成績に含める",
  targetGradeLabel: "目標成績の表示名",
  targetScore: "目標点数",
};

const GRADE_ITEM_FIELD_LABELS: Record<string, string> = {
  name: "評価項目名",
  category: "評価の種類",
  weight: "評価割合",
  maxScore: "満点",
};

/** "gradeItems.0.weight" のようなキーも読める見出しにする。 */
function toFieldLabel(key: string): string {
  const matched = /^gradeItems\.(\d+)\.(\w+)$/u.exec(key);

  if (matched === null) {
    return FIELD_LABELS[key] ?? key;
  }

  const [, index, field] = matched;
  return `評価項目 ${Number(index) + 1}: ${GRADE_ITEM_FIELD_LABELS[field] ?? field}`;
}

function StatusBadge({ status }: { status: ExtractionStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function NoteRow({ fieldKey, note }: { fieldKey: string; note: FieldNote }) {
  return (
    <li className="flex flex-col gap-1 border-b py-2 last:border-b-0 sm:flex-row sm:items-center sm:gap-3">
      <span className="min-w-40 text-sm font-medium">{toFieldLabel(fieldKey)}</span>
      <StatusBadge status={note.status} />
      <span className="text-xs text-[#697067]">
        {/* AIの出力は文字列としてそのまま表示する。HTMLとしては解釈しない。 */}
        {note.note ?? (note.evidence === null ? "" : `根拠: ${note.evidence}`)}
      </span>
    </li>
  );
}

/** 解析結果の項目ごとの状態を一覧で示す。 */
export function SubjectImportResult({ notes, warnings }: SubjectImportResultProps) {
  const entries = Object.entries(notes);

  return (
    <section className="flex flex-col gap-3 rounded-xl border bg-white p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold">解析結果</h2>
      <p className="text-sm text-[#697067]">
        下のフォームへ反映しました。記載なし・要確認の項目は必ず確認してください。
      </p>

      {warnings.length === 0 ? null : (
        <ul className="flex flex-col gap-1 rounded-md border border-[#f0d9a8] bg-[#fdf8ec] p-3">
          {warnings.map((warning) => (
            <li className="text-sm text-[#8a6414]" key={warning}>
              {warning}
            </li>
          ))}
        </ul>
      )}

      <ul className="flex flex-col">
        {entries.map(([key, note]) => (
          <NoteRow fieldKey={key} key={key} note={note} />
        ))}
      </ul>
    </section>
  );
}
