"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import type { GradeItem, GradeItemCategory, Subject } from "@/lib/types/domain";
import {
  MAX_SCORE,
  getGradeItemsWeightTotal,
  isGradeItemsWeightTotalValid,
  type SubjectFormErrors,
  type SubjectFormGradeItemValue,
  type SubjectFormValues,
  validateSubjectForm,
} from "./subjectFormValidation";

type SubjectFormAction = (formData: FormData) => void | Promise<void>;

type InitialGradeItem = Pick<
  GradeItem,
  "name" | "category" | "weight" | "maxScore" | "sortOrder"
>;

interface SubjectFormProps {
  subject?: Subject;
  gradeItems?: InitialGradeItem[];
  action?: SubjectFormAction;
  pending?: boolean;
  serverErrors?: SubjectFormErrors;
}

const CATEGORY_OPTIONS: Array<{ value: GradeItemCategory; label: string }> = [
  { value: "attendance", label: "出席" },
  { value: "assignment", label: "課題・レポート" },
  { value: "test", label: "テスト" },
  { value: "other", label: "その他" },
];

const inputClassName = "rounded-md border px-3 py-2";
const errorClassName = "text-sm text-red-700";
const actionButtonClassName = "hover:bg-gray-800 disabled:bg-black disabled:text-white";

/** 新しく追加する評価項目の初期値を作成する。 */
function createGradeItem(id: string): SubjectFormGradeItemValue {
  return {
    id,
    name: "",
    category: "test",
    weight: "",
    maxScore: "100",
  };
}

/** 編集時の初期評価項目を表示順に並べ、フォーム用の文字列値へ変換する。 */
function getInitialGradeItems(gradeItems?: InitialGradeItem[]): SubjectFormGradeItemValue[] {
  if (!gradeItems || gradeItems.length === 0) {
    return [createGradeItem("grade-item-0")];
  }

  return [...gradeItems]
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((item, index) => ({
      id: `grade-item-${index}`,
      name: item.name,
      category: item.category,
      weight: String(item.weight),
      maxScore: item.maxScore === null ? "" : String(item.maxScore),
    }));
}

/** エラーメッセージと入力欄を関連付けるためのIDを作成する。 */
function getErrorId(fieldName: string): string {
  return `${fieldName.replaceAll(".", "-")}-error`;
}

/** フィールドエラーがある場合だけ、アクセシブルなエラーメッセージを表示する。 */
function FieldError({ error, fieldName }: { error?: string; fieldName: string }) {
  if (!error) {
    return null;
  }

  return (
    <p id={getErrorId(fieldName)} className={errorClassName} role="alert">
      {error}
    </p>
  );
}

/** 科目設定と評価項目を入力・検証するクライアントフォーム。 */
export function SubjectForm({
  subject,
  gradeItems,
  action,
  pending = false,
  serverErrors = {},
}: SubjectFormProps) {
  const nextGradeItemId = useRef(gradeItems && gradeItems.length > 0 ? gradeItems.length : 1);
  const [values, setValues] = useState<SubjectFormValues>(() => {
    const initialGradeItems = getInitialGradeItems(gradeItems);

    return {
      name: subject?.name ?? "",
      totalClassCount: subject?.totalClassCount === null || subject === undefined
        ? ""
        : String(subject.totalClassCount),
      attendanceRequiredRate:
        subject?.attendanceRequiredRate === null || subject === undefined
          ? ""
          : String(subject.attendanceRequiredRate),
      attendanceMaxAbsences:
        subject?.attendanceMaxAbsences === null || subject === undefined
          ? ""
          : String(subject.attendanceMaxAbsences),
      attendanceAffectsGrade: subject?.attendanceAffectsGrade ?? false,
      targetGradeLabel: subject?.targetGradeLabel ?? "",
      targetScore: subject?.targetScore === null || subject === undefined ? "" : String(subject.targetScore),
      gradeItems: initialGradeItems,
    };
  });
  const [clientErrors, setClientErrors] = useState<SubjectFormErrors>({});

  const errors = { ...serverErrors, ...clientErrors };
  const weightTotal = getGradeItemsWeightTotal(values.gradeItems);
  const isWeightTotalValid = isGradeItemsWeightTotalValid(values.gradeItems);

  /** 科目情報・出席条件・目標の入力値を更新する。 */
  function updateValue<Key extends Exclude<keyof SubjectFormValues, "gradeItems">>(
    key: Key,
    value: SubjectFormValues[Key],
  ) {
    setValues((currentValues) => ({ ...currentValues, [key]: value }));
  }

  /** 指定した評価項目の入力値だけを更新する。 */
  function updateGradeItem(
    id: string,
    key: Exclude<keyof SubjectFormGradeItemValue, "id">,
    value: string,
  ) {
    setValues((currentValues) => ({
      ...currentValues,
      gradeItems: currentValues.gradeItems.map((item) =>
        item.id === id ? { ...item, [key]: value } : item,
      ),
    }));
  }

  /** 空の評価項目を末尾に追加する。 */
  function addGradeItem() {
    const id = `grade-item-${nextGradeItemId.current}`;
    nextGradeItemId.current += 1;
    setValues((currentValues) => ({
      ...currentValues,
      gradeItems: [...currentValues.gradeItems, createGradeItem(id)],
    }));
  }

  /** 指定した評価項目を削除し、表示順は配列順として詰め直す。 */
  function removeGradeItem(id: string) {
    setValues((currentValues) => ({
      ...currentValues,
      gradeItems: currentValues.gradeItems.filter((item) => item.id !== id),
    }));
  }

  /** 指定した評価項目を1つ上または下へ移動する。 */
  function moveGradeItem(index: number, direction: "up" | "down") {
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    setValues((currentValues) => {
      if (targetIndex < 0 || targetIndex >= currentValues.gradeItems.length) {
        return currentValues;
      }

      const nextGradeItems = [...currentValues.gradeItems];
      [nextGradeItems[index], nextGradeItems[targetIndex]] = [
        nextGradeItems[targetIndex],
        nextGradeItems[index],
      ];

      return { ...currentValues, gradeItems: nextGradeItems };
    });
  }

  /** 送信前にクライアント検証を行い、不正入力なら送信を止める。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const nextErrors = validateSubjectForm(values);
    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} className="flex flex-col gap-8" noValidate onSubmit={handleSubmit}>
      <fieldset className="flex flex-col gap-4">
        <legend className="font-medium">科目情報</legend>

        <label className="flex flex-col gap-1 text-sm" htmlFor="subject-name">
          科目名
          <input
            aria-describedby={errors.name ? getErrorId("name") : undefined}
            aria-invalid={Boolean(errors.name)}
            className={inputClassName}
            id="subject-name"
            name="name"
            onChange={(event) => updateValue("name", event.target.value)}
            required
            type="text"
            value={values.name}
          />
        </label>
        <FieldError error={errors.name} fieldName="name" />

        <label className="flex flex-col gap-1 text-sm" htmlFor="total-class-count">
          総授業回数
          <input
            aria-describedby={errors.totalClassCount ? getErrorId("totalClassCount") : undefined}
            aria-invalid={Boolean(errors.totalClassCount)}
            className={inputClassName}
            id="total-class-count"
            min="1"
            name="totalClassCount"
            onChange={(event) => updateValue("totalClassCount", event.target.value)}
            required
            step="1"
            type="number"
            value={values.totalClassCount}
          />
        </label>
        <FieldError error={errors.totalClassCount} fieldName="totalClassCount" />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-medium">出席条件</legend>

        <label className="flex flex-col gap-1 text-sm" htmlFor="attendance-required-rate">
          必要出席率（%）
          <input
            aria-describedby={errors.attendanceRequiredRate ? getErrorId("attendanceRequiredRate") : undefined}
            aria-invalid={Boolean(errors.attendanceRequiredRate)}
            className={inputClassName}
            id="attendance-required-rate"
            max="100"
            min="0"
            name="attendanceRequiredRate"
            onChange={(event) => updateValue("attendanceRequiredRate", event.target.value)}
            step="0.01"
            type="number"
            value={values.attendanceRequiredRate}
          />
        </label>
        <FieldError error={errors.attendanceRequiredRate} fieldName="attendanceRequiredRate" />

        <label className="flex flex-col gap-1 text-sm" htmlFor="attendance-max-absences">
          最大欠席数
          <input
            aria-describedby={errors.attendanceMaxAbsences ? getErrorId("attendanceMaxAbsences") : undefined}
            aria-invalid={Boolean(errors.attendanceMaxAbsences)}
            className={inputClassName}
            id="attendance-max-absences"
            max={values.totalClassCount || undefined}
            min="0"
            name="attendanceMaxAbsences"
            onChange={(event) => updateValue("attendanceMaxAbsences", event.target.value)}
            step="1"
            type="number"
            value={values.attendanceMaxAbsences}
          />
        </label>
        <FieldError error={errors.attendanceMaxAbsences} fieldName="attendanceMaxAbsences" />

        <label className="flex items-center gap-2 text-sm" htmlFor="attendance-affects-grade">
          <input
            checked={values.attendanceAffectsGrade}
            id="attendance-affects-grade"
            name="attendanceAffectsGrade"
            onChange={(event) => updateValue("attendanceAffectsGrade", event.target.checked)}
            type="checkbox"
            value="true"
          />
          出席を成績に含める
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-medium">目標成績</legend>

        <label className="flex flex-col gap-1 text-sm" htmlFor="target-grade-label">
          目標成績の表示名
          <input
            className={inputClassName}
            id="target-grade-label"
            name="targetGradeLabel"
            onChange={(event) => updateValue("targetGradeLabel", event.target.value)}
            placeholder="例: 目標成績"
            type="text"
            value={values.targetGradeLabel}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm" htmlFor="target-score">
          目標点数
          <input
            aria-describedby={errors.targetScore ? getErrorId("targetScore") : undefined}
            aria-invalid={Boolean(errors.targetScore)}
            className={inputClassName}
            id="target-score"
            max="100"
            min="0"
            name="targetScore"
            onChange={(event) => updateValue("targetScore", event.target.value)}
            step="0.01"
            type="number"
            value={values.targetScore}
          />
        </label>
        <FieldError error={errors.targetScore} fieldName="targetScore" />
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="font-medium">評価項目</legend>
        <p aria-live="polite" className={isWeightTotalValid ? "text-sm text-green-700" : "text-sm text-red-700"}>
          評価割合の合計: {weightTotal.toFixed(2)}%{isWeightTotalValid ? "（設定完了）" : "（100%にしてください）"}
        </p>
        <FieldError error={errors.gradeItems} fieldName="gradeItems" />

        <div className="flex flex-col gap-4">
          {values.gradeItems.map((item, index) => {
            const nameField = `gradeItems.${index}.name`;
            const weightField = `gradeItems.${index}.weight`;
            const maxScoreField = `gradeItems.${index}.maxScore`;
            const itemPrefix = `grade-item-${index}`;

            return (
              <div className="flex flex-col gap-3 rounded-md border p-4" key={item.id}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium">評価項目 {index + 1}</h3>
                  <div aria-label={`評価項目 ${index + 1} の操作`} className="flex flex-wrap gap-2" role="group">
                    <Button
                      disabled={index === 0}
                      className={actionButtonClassName}
                      onClick={() => moveGradeItem(index, "up")}
                      type="button"
                      variant="primary"
                    >
                      上へ
                    </Button>
                    <Button
                      disabled={index === values.gradeItems.length - 1}
                      className={actionButtonClassName}
                      onClick={() => moveGradeItem(index, "down")}
                      type="button"
                      variant="primary"
                    >
                      下へ
                    </Button>
                    <Button
                      className={actionButtonClassName}
                      onClick={() => removeGradeItem(item.id)}
                      type="button"
                      variant="primary"
                    >
                      削除
                    </Button>
                  </div>
                </div>

                <input name={`gradeItems[${index}][sortOrder]`} type="hidden" value={index} />

                <label className="flex flex-col gap-1 text-sm" htmlFor={`${itemPrefix}-name`}>
                  評価項目名
                  <input
                    aria-describedby={errors[nameField] ? getErrorId(nameField) : undefined}
                    aria-invalid={Boolean(errors[nameField])}
                    className={inputClassName}
                    id={`${itemPrefix}-name`}
                    name={`gradeItems[${index}][name]`}
                    onChange={(event) => updateGradeItem(item.id, "name", event.target.value)}
                    required
                    type="text"
                    value={item.name}
                  />
                </label>
                <FieldError error={errors[nameField]} fieldName={nameField} />

                <label className="flex flex-col gap-1 text-sm" htmlFor={`${itemPrefix}-category`}>
                  評価の種類
                  <select
                    className={inputClassName}
                    id={`${itemPrefix}-category`}
                    name={`gradeItems[${index}][category]`}
                    onChange={(event) => updateGradeItem(item.id, "category", event.target.value)}
                    value={item.category}
                  >
                    {CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm" htmlFor={`${itemPrefix}-weight`}>
                  評価割合（%）
                  <input
                    aria-describedby={errors[weightField] ? getErrorId(weightField) : undefined}
                    aria-invalid={Boolean(errors[weightField])}
                    className={inputClassName}
                    id={`${itemPrefix}-weight`}
                    max="100"
                    min="0"
                    name={`gradeItems[${index}][weight]`}
                    onChange={(event) => updateGradeItem(item.id, "weight", event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={item.weight}
                  />
                </label>
                <FieldError error={errors[weightField]} fieldName={weightField} />

                <label className="flex flex-col gap-1 text-sm" htmlFor={`${itemPrefix}-max-score`}>
                  満点
                  <input
                    aria-describedby={errors[maxScoreField] ? getErrorId(maxScoreField) : undefined}
                    aria-invalid={Boolean(errors[maxScoreField])}
                    className={inputClassName}
                    id={`${itemPrefix}-max-score`}
                    max={MAX_SCORE}
                    min="0.01"
                    name={`gradeItems[${index}][maxScore]`}
                    onChange={(event) => updateGradeItem(item.id, "maxScore", event.target.value)}
                    required
                    step="0.01"
                    type="number"
                    value={item.maxScore}
                  />
                </label>
                <FieldError error={errors[maxScoreField]} fieldName={maxScoreField} />
              </div>
            );
          })}
        </div>

        <Button
          className={actionButtonClassName}
          onClick={addGradeItem}
          type="button"
          variant="primary"
        >
          評価項目を追加
        </Button>
      </fieldset>

      <Button className={actionButtonClassName} disabled={pending} type="submit">
        {pending ? "保存中…" : "保存"}
      </Button>
    </form>
  );
}
