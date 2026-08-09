"use client";

import { useState, useTransition } from "react";
import { extractSubjectAction } from "@/app/subjects/new/extractSubjectAction";
import { Button } from "@/components/ui/Button";
import { MAX_INPUT_LENGTH } from "@/lib/subject-import/extractionPrompt";
import type { SubjectImportDraft } from "@/lib/subject-import/types";

interface SubjectImportPanelProps {
  onDraft: (draft: SubjectImportDraft) => void;
}

const PLACEHOLDER = `例1: 線形代数、全15回、出席率80%以上、中間30%・期末70%、目標は80点

例2: シラバスの「成績評価方法」や「授業計画」の欄をそのまま貼り付けてください。`;

/**
 * 自然言語やシラバス本文を受け取り、解析結果を親へ渡す。
 * 解析中はボタンを無効化して二重送信を防ぐ。入力本文は失敗後も保持する。
 */
export function SubjectImportPanel({ onDraft }: SubjectImportPanelProps) {
  const [inputText, setInputText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const [isPending, startTransition] = useTransition();

  function handleExtract() {
    if (isPending) {
      return;
    }

    setErrorMessage(null);

    startTransition(async () => {
      const result = await extractSubjectAction(inputText);

      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }

      onDraft(result.draft);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">AIでかんたん登録</h2>
        <Button onClick={() => setIsOpen((current) => !current)} type="button" variant="secondary">
          {isOpen ? "手動で詳しく登録" : "AIでかんたん登録"}
        </Button>
      </div>

      {isOpen ? (
        <>
          <p className="text-sm text-[#697067]">
            授業の説明やシラバス本文を貼り付けると、下のフォームへ下書きを作ります。
            保存する前に内容を確認・修正できます。
          </p>

          <label className="flex flex-col gap-1 text-sm" htmlFor="subject-import-input">
            解析する文章
            <textarea
              className="min-h-40 px-3 py-2"
              disabled={isPending}
              id="subject-import-input"
              maxLength={MAX_INPUT_LENGTH}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={PLACEHOLDER}
              value={inputText}
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={isPending} onClick={handleExtract} type="button">
              {isPending ? "解析中…" : "解析する"}
            </Button>
            <span aria-live="polite" className="text-xs text-[#697067]">
              {inputText.length.toLocaleString("ja-JP")} /{" "}
              {MAX_INPUT_LENGTH.toLocaleString("ja-JP")} 文字
            </span>
          </div>

          {errorMessage === null ? null : (
            <p
              className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700"
              role="alert"
            >
              {errorMessage}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-[#697067]">
          下のフォームへ直接入力できます。AI解析へ戻っても、入力済みの内容は残ります。
        </p>
      )}
    </section>
  );
}
