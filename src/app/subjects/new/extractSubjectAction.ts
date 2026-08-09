"use server";

import { extractSubject } from "@/lib/subject-import/extractSubject";
import { MAX_INPUT_LENGTH, normalizeInputText } from "@/lib/subject-import/extractionPrompt";
import { normalizeExtraction } from "@/lib/subject-import/normalizeExtraction";
import type { SubjectImportDraft, SubjectImportError } from "@/lib/subject-import/types";
import { createClient } from "@/lib/supabase/server";

export type ExtractSubjectActionResult =
  | { ok: true; draft: SubjectImportDraft }
  | { ok: false; message: string };

const ERROR_MESSAGES: Record<SubjectImportError, string> = {
  unauthenticated: "ログインの有効期限が切れています。再度ログインしてください。",
  empty_input: "解析する文章を入力してください。",
  too_long: `入力は${MAX_INPUT_LENGTH.toLocaleString("ja-JP")}文字以内にしてください。`,
  multiple_subjects: "複数の科目が含まれているようです。1科目ずつ入力してください。",
  invalid_response: "解析結果を読み取れませんでした。文章を整理して再度お試しください。",
  timeout: "解析に時間がかかりすぎました。文章を短くして再度お試しください。",
  provider_error: "解析サービスに接続できませんでした。時間をおいて再度お試しください。",
  not_configured: "AI解析は現在利用できません。手動で登録してください。",
  unknown: "解析に失敗しました。時間をおいて再度お試しください。",
};

function toFailure(error: SubjectImportError): ExtractSubjectActionResult {
  return { ok: false, message: ERROR_MESSAGES[error] };
}

/**
 * 入力本文を解析して科目登録の下書きを返す。DBへは一切保存しない。
 *
 * このActionはフォームを介さず直接呼び出せる公開エンドポイントになるため、
 * 認証と入力長の確認を必ず先頭で行い、引数は解析対象の文字列だけを受け取る。
 */
export async function extractSubjectAction(
  inputText: string,
): Promise<ExtractSubjectActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return toFailure("unauthenticated");
  }

  // TODO: 一般公開時はここでユーザー単位のレート制限を確認する（issue #49、1分5回想定）。
  // 現状はクライアント側の二重送信防止のみで、Actionを直接呼ばれた場合は制限されない。

  if (typeof inputText !== "string") {
    return toFailure("empty_input");
  }

  // 極端に長い入力は、正規化する前に弾いて無駄な処理を避ける。
  if (inputText.length > MAX_INPUT_LENGTH * 2) {
    return toFailure("too_long");
  }

  const normalized = normalizeInputText(inputText);

  if (normalized === "") {
    return toFailure("empty_input");
  }

  if (normalized.length > MAX_INPUT_LENGTH) {
    return toFailure("too_long");
  }

  const extracted = await extractSubject(normalized);

  if (!extracted.ok) {
    return toFailure(extracted.error);
  }

  const normalizedResult = normalizeExtraction(extracted.draft, normalized);

  if (!normalizedResult.ok) {
    return toFailure(normalizedResult.error);
  }

  return { ok: true, draft: normalizedResult.draft };
}
