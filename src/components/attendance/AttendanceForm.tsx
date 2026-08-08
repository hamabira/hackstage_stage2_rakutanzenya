"use client";

import { useActionState } from "react";
<<<<<<< HEAD
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
=======
import { saveAttendanceAction } from "@/app/subjects/[id]/attendance/actions";
import { Button } from "@/components/ui/Button";
import {
  ATTENDANCE_STATUSES,
  ATTENDANCE_STATUS_LABELS,
  MEMO_MAX_LENGTH,
} from "@/lib/attendance/attendanceFormValidation";
import { initialAttendanceFormState } from "@/lib/attendance/attendanceFormState";
import type { AttendanceStatus } from "@/lib/types/domain";

export interface AttendanceFormValue {
  classDate: string;
  status: AttendanceStatus;
  memo: string;
}

interface AttendanceFormProps {
  subjectId: string;
  /** 一覧の「編集」で選ばれた記録。変わるたびに入力欄へ反映する。 */
  value: AttendanceFormValue;
  onChange: (value: AttendanceFormValue) => void;
  /** 保存済みの授業日。重複登録を画面上でも知らせるために使う。 */
  recordedDates: string[];
}

const inputClassName = "rounded-md border px-3 py-2";

/** 出席記録を登録・上書きするフォーム。 */
export function AttendanceForm({
  subjectId,
  value,
  onChange,
  recordedDates,
}: AttendanceFormProps) {
  const [state, formAction, pending] = useActionState(
    saveAttendanceAction,
    initialAttendanceFormState,
  );
  // 保存後も入力値は消さない。連続する授業日を記録するとき、日付だけ
  // 変えれば続けて登録できるため。
  const isOverwrite = value.classDate !== "" && recordedDates.includes(value.classDate);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="subjectId" value={subjectId} />

      <label className="flex flex-col gap-1 text-sm" htmlFor="class-date">
        授業日
        <input
          aria-describedby={state.fieldErrors.classDate ? "class-date-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors.classDate)}
          className={inputClassName}
          id="class-date"
          name="classDate"
          onChange={(event) => onChange({ ...value, classDate: event.target.value })}
          required
          type="date"
          value={value.classDate}
        />
      </label>
      {state.fieldErrors.classDate ? (
        <p className="text-sm text-red-700" id="class-date-error" role="alert">
          {state.fieldErrors.classDate}
        </p>
      ) : null}

      {isOverwrite ? (
        <p className="text-sm text-yellow-700" role="status">
          この日はすでに記録済みです。保存すると上書きされます。
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm">出席状態</legend>
        <div className="flex flex-wrap gap-4">
          {ATTENDANCE_STATUSES.map((status) => (
            <label className="flex items-center gap-2 text-sm" key={status}>
              <input
                checked={value.status === status}
                name="status"
                onChange={() => onChange({ ...value, status })}
                type="radio"
                value={status}
              />
              {ATTENDANCE_STATUS_LABELS[status]}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1 text-sm" htmlFor="memo">
        メモ(任意)
        <textarea
          aria-describedby={state.fieldErrors.memo ? "memo-error" : undefined}
          aria-invalid={Boolean(state.fieldErrors.memo)}
          className={inputClassName}
          id="memo"
          maxLength={MEMO_MAX_LENGTH}
          name="memo"
          onChange={(event) => onChange({ ...value, memo: event.target.value })}
          rows={2}
          value={value.memo}
        />
      </label>
      {state.fieldErrors.memo ? (
        <p className="text-sm text-red-700" id="memo-error" role="alert">
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

      <Button disabled={pending} type="submit">
        {pending ? "保存中…" : isOverwrite ? "上書き保存" : "記録する"}
      </Button>
>>>>>>> ab9fe9b4726c838b8521d45986b3449ebab7357d
    </form>
  );
}
