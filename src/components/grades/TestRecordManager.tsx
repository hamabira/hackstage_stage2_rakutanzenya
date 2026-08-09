"use client";

import { useCallback, useState } from "react";
import { DeleteTestRecordButton } from "@/components/grades/DeleteTestRecordButton";
import {
  TestRecordForm,
  type TestRecordFormValue,
} from "@/components/grades/TestRecordForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getTodayDateInputValue } from "@/lib/date/todayDateInputValue";
import type { GradeItem, TestRecord } from "@/lib/types/domain";

interface TestRecordManagerProps {
  subjectId: string;
  gradeItems: GradeItem[];
  records: TestRecord[];
}

/** 実施日は当日を入力しての記録が大半のため、今日の日付を初期値にする。 */
function createEmptyValue(): TestRecordFormValue {
  return {
    recordId: "",
    gradeItemId: "",
    score: "",
    recordedAt: getTodayDateInputValue(),
    memo: "",
  };
}

/**
 * 得点記録の入力フォームと一覧をつなぐ。
 * 一覧の「編集」を押すと、その記録の値をフォームへ読み込む。
 */
export function TestRecordManager({
  subjectId,
  gradeItems,
  records,
}: TestRecordManagerProps) {
  const [value, setValue] = useState<TestRecordFormValue>(createEmptyValue);

  const handleChange = useCallback((next: TestRecordFormValue) => {
    setValue(next);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setValue(createEmptyValue());
  }, []);

  function handleEdit(record: TestRecord) {
    setValue({
      recordId: record.id,
      gradeItemId: record.gradeItemId,
      score: String(record.score),
      recordedAt: record.recordedAt,
      memo: record.memo ?? "",
    });
  }

  /** 一覧では評価項目名と満点を併記するため、IDから引けるようにする。 */
  const gradeItemsById = new Map(gradeItems.map((item) => [item.id, item]));

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <h2 className="font-medium">
          {value.recordId === "" ? "得点を記録する" : "記録を編集する"}
        </h2>
        {gradeItems.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            評価項目が登録されていません。先に評価方法を登録してください。
          </p>
        ) : (
          <div className="mt-4">
            <TestRecordForm
              gradeItems={gradeItems}
              onCancelEdit={handleCancelEdit}
              onChange={handleChange}
              subjectId={subjectId}
              value={value}
            />
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-medium">記録一覧({records.length}件)</h2>
        <div className="mt-4">
          {records.length === 0 ? (
            <p className="text-sm text-gray-500">
              まだ得点の記録がありません。上のフォームから記録してください。
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {records.map((record) => {
                const gradeItem = gradeItemsById.get(record.gradeItemId);
                const label = `${gradeItem?.name ?? "不明な評価項目"} (${record.recordedAt})`;

                return (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3"
                    key={record.id}
                  >
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium">
                          {gradeItem?.name ?? "不明な評価項目"}
                        </span>
                        <span>
                          {record.score} / {gradeItem?.maxScore ?? "満点未設定"}
                        </span>
                        <span className="text-gray-600">{record.recordedAt}</span>
                      </div>
                      {record.memo ? (
                        <p className="text-sm text-gray-600">{record.memo}</p>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        className="border bg-white text-gray-800"
                        onClick={() => handleEdit(record)}
                        type="button"
                        variant="secondary"
                      >
                        編集
                      </Button>
                      <DeleteTestRecordButton
                        label={label}
                        recordId={record.id}
                        subjectId={subjectId}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
