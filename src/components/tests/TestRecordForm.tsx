"use client";

import { useActionState, useEffect, useRef } from "react";
import type { TestRecordMutationState } from "@/app/actions/testRecords";

interface TestRecordFormProps {
  itemName: string;
  maxScore: number;
  action: (
    prevState: TestRecordMutationState,
    formData: FormData,
  ) => Promise<TestRecordMutationState>;
  /** 編集モード時の既存値 */
  defaultScore?: number;
  defaultRecordedAt?: string;
  defaultMemo?: string;
  submitLabel?: string;
}

const initialState: TestRecordMutationState = { error: null };

/** 今日の日付を YYYY-MM-DD 形式で返す。 */
function getTodayString(): string {
  return new Date().toLocaleDateString("sv-SE");
}

export function TestRecordForm({
  itemName,
  maxScore,
  action,
  defaultScore,
  defaultRecordedAt,
  defaultMemo,
  submitLabel = "記録する",
}: TestRecordFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  // 保存成功（resetKey 更新）時にフォームをリセットする
  useEffect(() => {
    if (state.resetKey && !state.error) {
      formRef.current?.reset();
    }
  }, [state.resetKey, state.error]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded-lg border p-4 bg-gray-50"
    >
      <p className="text-sm font-medium">{itemName}</p>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm flex-1 min-w-[120px]">
          点数（満点: {maxScore}）
          <input
            type="number"
            name="score"
            min={0}
            max={maxScore}
            step={0.01}
            defaultValue={defaultScore}
            required
            className="rounded-md border px-3 py-2 bg-white"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm flex-1 min-w-[140px]">
          記録日
          <input
            type="date"
            name="recordedAt"
            defaultValue={defaultRecordedAt ?? getTodayString()}
            required
            className="rounded-md border px-3 py-2 bg-white"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        メモ（任意）
        <input
          type="text"
          name="memo"
          defaultValue={defaultMemo ?? ""}
          className="rounded-md border px-3 py-2 bg-white"
          placeholder="例: 追試、自己採点 など"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "保存中…" : submitLabel}
      </button>
    </form>
  );
}
