"use client";

import { useActionState } from "react";
import type { AttendanceMutationState } from "@/app/actions/attendance";

interface AttendanceFormProps {
  action: (
    prevState: AttendanceMutationState,
    formData: FormData,
  ) => Promise<AttendanceMutationState>;
}

const initialState: AttendanceMutationState = { error: null };

/** 今日の日付を YYYY-MM-DD 形式で返す。 */
function getTodayString(): string {
  return new Date().toLocaleDateString("sv-SE"); // sv-SE ロケールは YYYY-MM-DD 形式
}

export function AttendanceForm({ action }: AttendanceFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      <h2 className="font-medium">出席を記録する</h2>

      {state.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        授業日
        <input
          type="date"
          name="classDate"
          defaultValue={getTodayString()}
          required
          className="rounded-md border px-3 py-2"
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">出席状態</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="status"
            value="present"
            defaultChecked
            required
          />
          出席
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="radio" name="status" value="absent" required />
          欠席
        </label>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm">
        メモ（任意）
        <textarea
          name="memo"
          rows={2}
          className="rounded-md border px-3 py-2 resize-none"
          placeholder="例: 風邪のため欠席"
        />
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {isPending ? "保存中…" : "記録する"}
      </button>
    </form>
  );
}
