"use client";

import { useState, useActionState } from "react";
import type { Subject, GradeItemCategory } from "@/lib/types/domain";
import { Button } from "@/components/ui/Button";
import { createSubject } from "@/app/actions/subjects";

interface GradeItemInput {
  id: number; // For React key
  name: string;
  category: GradeItemCategory;
  weight: number;
  maxScore: number | "";
}

export function SubjectForm({ subject }: { subject?: Subject }) {
  const [state, formAction, isPending] = useActionState(createSubject, { error: null });
  const [gradeItems, setGradeItems] = useState<GradeItemInput[]>(
    []
  );

  const addGradeItem = () => {
    setGradeItems([
      ...gradeItems,
      { id: Date.now(), name: "", category: "test", weight: 0, maxScore: 100 },
    ]);
  };

  const removeGradeItem = (id: number) => {
    setGradeItems(gradeItems.filter((item) => item.id !== id));
  };

  const updateGradeItem = (
    id: number,
    field: keyof GradeItemInput,
    value: string | number
  ) => {
    setGradeItems(
      gradeItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {state.error}
        </div>
      )}

      {/* 基本情報 */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b pb-2">基本情報</h2>
        <label className="flex flex-col gap-1 text-sm">
          科目名 <span className="text-red-500">*</span>
          <input
            type="text"
            name="name"
            required
            defaultValue={subject?.name}
            className="rounded-md border px-3 py-2"
          />
        </label>
        
        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            目標成績 (例: S, A)
            <input
              type="text"
              name="targetGradeLabel"
              defaultValue={subject?.targetGradeLabel || ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            目標スコア (100点満点等)
            <input
              type="number"
              name="targetScore"
              step="0.01"
              defaultValue={subject?.targetScore || ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
        </div>
      </div>

      {/* 出席条件 */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b pb-2">出席条件</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="attendanceAffectsGrade"
            defaultChecked={subject?.attendanceAffectsGrade}
            className="rounded border-gray-300"
          />
          出席が成績要件に含まれる
        </label>
        
        <div className="grid grid-cols-3 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            総授業回数
            <input
              type="number"
              name="totalClassCount"
              defaultValue={subject?.totalClassCount ?? ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            必須出席率 (%)
            <input
              type="number"
              name="attendanceRequiredRate"
              step="0.01"
              defaultValue={subject?.attendanceRequiredRate ?? ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            上限欠席数
            <input
              type="number"
              name="attendanceMaxAbsences"
              defaultValue={subject?.attendanceMaxAbsences ?? ""}
              className="rounded-md border px-3 py-2"
            />
          </label>
        </div>
      </div>

      {/* 評価項目 */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium border-b pb-2 flex justify-between items-center">
          評価項目
          <Button type="button" onClick={addGradeItem} className="px-2 py-1 text-xs">
            + 項目を追加
          </Button>
        </h2>
        
        {gradeItems.length === 0 ? (
          <p className="text-sm text-gray-500">評価項目がありません。</p>
        ) : (
          <div className="flex flex-col gap-3">
            {gradeItems.map((item, index) => (
              <div key={item.id} className="flex gap-2 items-end border p-3 rounded-md bg-gray-50">
                <label className="flex flex-col gap-1 text-xs flex-1">
                  項目名
                  <input
                    type="text"
                    name={`gradeItem_name_${index}`}
                    required
                    value={item.name}
                    onChange={(e) => updateGradeItem(item.id, "name", e.target.value)}
                    className="rounded border px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs">
                  カテゴリ
                  <select
                    name={`gradeItem_category_${index}`}
                    value={item.category}
                    onChange={(e) => updateGradeItem(item.id, "category", e.target.value)}
                    className="rounded border px-2 py-1 bg-white"
                  >
                    <option value="attendance">出席</option>
                    <option value="assignment">課題</option>
                    <option value="test">テスト</option>
                    <option value="other">その他</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-xs w-20">
                  比重 (%)
                  <input
                    type="number"
                    name={`gradeItem_weight_${index}`}
                    required
                    step="0.01"
                    value={item.weight}
                    onChange={(e) => updateGradeItem(item.id, "weight", parseFloat(e.target.value) || 0)}
                    className="rounded border px-2 py-1"
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs w-20">
                  満点
                  <input
                    type="number"
                    name={`gradeItem_maxScore_${index}`}
                    step="0.01"
                    value={item.maxScore}
                    onChange={(e) => updateGradeItem(item.id, "maxScore", parseFloat(e.target.value) || "")}
                    className="rounded border px-2 py-1"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => removeGradeItem(item.id)}
                  className="text-red-500 text-xs px-2 py-1 border border-red-200 rounded hover:bg-red-50 mb-0.5"
                >
                  削除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "保存中..." : "保存"}
        </Button>
      </div>
    </form>
  );
}
