// このファイルだけがAIプロバイダ(Gemini)を知る。サーバー専用。
// クライアントコンポーネントから import しないこと（APIキーと指示文がバンドルへ混入する）。
import {
  buildExtractionUserContent,
  EXTRACTION_SYSTEM_INSTRUCTION,
} from "./extractionPrompt";
import { EXTRACTION_RESPONSE_SCHEMA, isExtractedSubjectDraft } from "./extractionSchema";
import type { ExtractedSubjectDraft, SubjectImportError } from "./types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";
/** Workerの実行時間に収まるよう、1回の呼び出しはここで打ち切る。 */
export const EXTRACTION_TIMEOUT_MS = 15_000;
/** 一時的な応答不良・通信障害のとき、合計2回まで試行する。 */
export const MAX_ATTEMPTS = 2;

const API_ORIGIN = "https://generativelanguage.googleapis.com";
const DEFAULT_RETRY_DELAY_MS = 250;
const MAX_RETRY_DELAY_MS = 1_000;

export type ExtractSubjectError = Extract<
  SubjectImportError,
  "invalid_response" | "timeout" | "provider_error" | "not_configured"
>;

export type ExtractSubjectResult =
  | { ok: true; draft: ExtractedSubjectDraft; attempts: number }
  | { ok: false; error: ExtractSubjectError };

export interface ExtractSubjectDeps {
  /** テストで差し替えるための注入点。既定は globalThis.fetch。 */
  fetchImpl?: typeof fetch;
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

/**
 * 1回の呼び出し結果。retryableのときだけ再試行する。
 * reasonは、再試行しても駄目だったときにどのエラーを返すかの判断に使う。
 */
type AttemptOutcome =
  | { kind: "success"; draft: ExtractedSubjectDraft }
  | { kind: "retryable"; reason: "invalid_response" | "provider_error"; retryDelayMs: number }
  | { kind: "fatal"; error: ExtractSubjectError };

function clampRetryDelay(delayMs: number): number {
  return Math.min(Math.max(delayMs, 0), MAX_RETRY_DELAY_MS);
}

/** Retry-After は秒数またはHTTP-dateのどちらも許容される。 */
function retryDelayFromResponse(response: Response): number {
  const retryAfter = response.headers?.get("retry-after");
  if (retryAfter === null || retryAfter === undefined) {
    return DEFAULT_RETRY_DELAY_MS;
  }

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds)) {
    return clampRetryDelay(Math.ceil(seconds * 1_000));
  }

  const retryAt = Date.parse(retryAfter);
  return Number.isNaN(retryAt)
    ? DEFAULT_RETRY_DELAY_MS
    : clampRetryDelay(retryAt - Date.now());
}

function waitForRetry(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function buildRequestBody(normalizedInput: string): string {
  return JSON.stringify({
    systemInstruction: { parts: [{ text: EXTRACTION_SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: buildExtractionUserContent(normalizedInput) }] }],
    generationConfig: {
      // 抽出タスクなので毎回同じ結果になってほしい。
      temperature: 0,
      responseMimeType: "application/json",
      responseSchema: EXTRACTION_RESPONSE_SCHEMA,
    },
  });
}

/** 応答から構造化JSONの本文を取り出す。取り出せない形なら null。 */
function readResponseText(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidates = (payload as { candidates?: unknown }).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }

  const candidate = candidates[0] as {
    finishReason?: unknown;
    content?: { parts?: unknown };
  };

  // STOP以外は途中打ち切り（MAX_TOKENSなど）で、JSONが欠けている可能性が高い。
  if (typeof candidate.finishReason === "string" && candidate.finishReason !== "STOP") {
    return null;
  }

  const parts = candidate.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    return null;
  }

  const text = (parts[0] as { text?: unknown }).text;
  return typeof text === "string" ? text : null;
}

async function runAttempt(
  normalizedInput: string,
  config: { fetchImpl: typeof fetch; apiKey: string; model: string; timeoutMs: number },
): Promise<AttemptOutcome> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await config.fetchImpl(
      `${API_ORIGIN}/v1beta/models/${config.model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          // URLへ載せるとログや履歴に残るため、ヘッダで渡す。
          "x-goog-api-key": config.apiKey,
        },
        body: buildRequestBody(normalizedInput),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      // 本文には入力がそのまま含まれ得るため、状態コードだけを残す。
      console.error("[subject-import] Gemini API error", { status: response.status });

      // 混雑や一時的な障害は再試行する余地がある。
      // 認証やモデル名の誤りなど恒久的な誤りは繰り返しても直らない。
      if (response.status === 429 || response.status >= 500) {
        return {
          kind: "retryable",
          reason: "provider_error",
          retryDelayMs: retryDelayFromResponse(response),
        };
      }

      return { kind: "fatal", error: "provider_error" };
    }

    const payload: unknown = await response.json();
    const text = readResponseText(payload);
    if (text === null) {
      return { kind: "retryable", reason: "invalid_response", retryDelayMs: DEFAULT_RETRY_DELAY_MS };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { kind: "retryable", reason: "invalid_response", retryDelayMs: DEFAULT_RETRY_DELAY_MS };
    }

    if (!isExtractedSubjectDraft(parsed)) {
      return { kind: "retryable", reason: "invalid_response", retryDelayMs: DEFAULT_RETRY_DELAY_MS };
    }

    return { kind: "success", draft: parsed };
  } catch (error) {
    // 中断はタイムアウト。再試行すると待ち時間が倍になるため、ここで打ち切る。
    if (error instanceof Error && error.name === "AbortError") {
      return { kind: "fatal", error: "timeout" };
    }

    // 任意の例外メッセージには入力本文が含まれ得るため、種別だけを残す。
    console.error("[subject-import] Gemini API request failed", {
      name: error instanceof Error ? error.name : typeof error,
    });

    // 瞬間的な通信断で毎回入力し直させないよう、1回だけやり直す。
    return {
      kind: "retryable",
      reason: "provider_error",
      retryDelayMs: DEFAULT_RETRY_DELAY_MS,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 入力本文をGeminiへ渡し、構造化された抽出結果を得る。
 * 一時的な応答不良・通信障害のときだけ1回再試行し、合計2回を超えて呼び出さない。
 * 入力本文と応答本文はログへ出さない。
 */
export async function extractSubject(
  normalizedInput: string,
  deps: ExtractSubjectDeps = {},
): Promise<ExtractSubjectResult> {
  // Workersでは初回リクエスト時に process.env が構築されるため、モジュール読み込み時ではなくここで読む。
  const apiKey = deps.apiKey ?? process.env.GEMINI_API_KEY;
  if (apiKey === undefined || apiKey === "") {
    return { ok: false, error: "not_configured" };
  }

  // .env の `GEMINI_MODEL=` は空文字として読み込まれるため、?? では既定値へ落ちない。
  const configuredModel = deps.model ?? process.env.GEMINI_MODEL;

  const config = {
    fetchImpl: deps.fetchImpl ?? globalThis.fetch,
    apiKey,
    model:
      configuredModel === undefined || configuredModel.trim() === ""
        ? DEFAULT_GEMINI_MODEL
        : configuredModel.trim(),
    timeoutMs: deps.timeoutMs ?? EXTRACTION_TIMEOUT_MS,
  };

  let lastReason: ExtractSubjectError = "invalid_response";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const outcome = await runAttempt(normalizedInput, config);

    if (outcome.kind === "success") {
      return { ok: true, draft: outcome.draft, attempts: attempt };
    }

    if (outcome.kind === "fatal") {
      return { ok: false, error: outcome.error };
    }

    lastReason = outcome.reason;
    if (attempt < MAX_ATTEMPTS) {
      await waitForRetry(outcome.retryDelayMs);
    }
  }

  // 最後の失敗理由をそのまま返し、通信障害と解析失敗で案内を分ける。
  return { ok: false, error: lastReason };
}
