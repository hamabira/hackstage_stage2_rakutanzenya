"use client";

import { useActionState } from "react";
import { saveTestRecordAction } from "@/app/subjects/[id]/tests/actions";
import { Button } from "@/components/ui/Button";
import { initialTestRecordFormState } from "@/lib/grades/testRecordFormState";
import {
  MEMO_MAX_LENGTH,
  type TestRecordFormValues,
} from "@/lib/grades/testRecordFormValidation";
import type { GradeItem } from "@/lib/types/domain";

interface TestRecordFormProps {
  subjectId: string;
  gradeItems: GradeItem[];
  value: TestRecordFormValues;
  onChange: (value: TestRecordFormValues) => void;
  onCancelEdit: () => void;
}

const inputClassName = "rounded-md border px-3 py-2";

/** 得点記録を登録・更新するフォーム。 */
export function TestRecordForm({
  subjectId,
  gradeItems,
  value,
  onChange,
  onCancelEdit,
}: TestRecordFormProps) {
  const saveAction = saveTestRecordAction.bind(null, subjectId);
  const [state, formAction, pending] = useActionState(
    saveAction,
    initialTestRecordFormState,
  );

  const isEditing = value.recordId !== "";
  const selectedGradeItem = gradeItems.find((item) => item.id === value.gradeItemId);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="recordId" value={value.recordId} />

      <label className="flex flex-col gap-1 text-sm" htmlFor="grade-item">
        評価項目
        <select
          aria-invalid={Boolean(state.fieldErrors.gradeItemId)}
          className={inputClassName}
          // 編集中は対象の評価項目を変えられない。付け替えは削除して登録し直す。
          disabled={isEditing}
          id="grade-item"
          name="gradeItemId"
          onChange={(event) => onChange({ ...value, gradeItemId: event.target.value })}
          value={value.gradeItemId}
        >
          <option value="">選択してください</option>
          {gradeItems.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}({item.maxScore === null ? "満点未設定" : `満点 ${item.maxScore}`})
            </option>
          ))}
        </select>
      </label>
      {/* disabled な select は送信されないため、編集時は hidden で値を送る。 */}
      {isEditing ? (
        <input type="hidden" name="gradeItemId" value={value.gradeItemId} />
      ) : null}
      {state.fieldErrors.gradeItemId ? (
        <p className="text-sm text-red-700" role="alert">
          {state.fieldErrors.gradeItemId}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm" htmlFor="score">
        得点
        {selectedGradeItem && selectedGradeItem.maxScore !== null ? (
          <span className="text-gray-600">満点: {selectedGradeItem.maxScore} 点</span>
        ) : null}
        <input
          aria-invalid={Boolean(state.fieldErrors.score)}
          className={inputClassName}
          id="score"
          max={selectedGradeItem?.maxScore ?? undefined}
          min="0"
          name="score"
          onChange={(event) => onChange({ ...value, score: event.target.value })}
          required
          step="0.01"
          type="number"
          value={value.score}
        />
      </label>
      {state.fieldErrors.score ? (
        <p className="text-sm text-red-700" role="alert">
          {state.fieldErrors.score}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm" htmlFor="recorded-at">
        実施日
        <input
          aria-invalid={Boolean(state.fieldErrors.recordedAt)}
          className={inputClassName}
          id="recorded-at"
          name="recordedAt"
          onChange={(event) => onChange({ ...value, recordedAt: event.target.value })}
          required
          type="date"
          value={value.recordedAt}
        />
      </label>
      {state.fieldErrors.recordedAt ? (
        <p className="text-sm text-red-700" role="alert">
          {state.fieldErrors.recordedAt}
        </p>
      ) : null}

      <label className="flex flex-col gap-1 text-sm" htmlFor="test-memo">
        メモ(任意)
        <textarea
          aria-invalid={Boolean(state.fieldErrors.memo)}
          className={inputClassName}
          id="test-memo"
          maxLength={MEMO_MAX_LENGTH}
          name="memo"
          onChange={(event) => onChange({ ...value, memo: event.target.value })}
          rows={2}
          value={value.memo}
        />
      </label>
      {state.fieldErrors.memo ? (
        <p className="text-sm text-red-700" role="alert">
          {state.fieldErrors.memo}
        </p>
      ) : null}

      {state.message ? (
        <p
          className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
          role="alert"
        >
          {state.message}
        </p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-green-700" role="status">
          記録を保存しました。
        </p>
      ) : null}

      <div className="flex gap-2">
        <Button disabled={pending} type="submit">
          {pending ? "保存中…" : isEditing ? "更新する" : "記録する"}
        </Button>
        {isEditing ? (
          <Button
            className="border bg-white text-gray-800"
            onClick={onCancelEdit}
            type="button"
            variant="secondary"
          >
            編集をやめる
          </Button>
        ) : null}
      </div>
    </form>
  );
}
