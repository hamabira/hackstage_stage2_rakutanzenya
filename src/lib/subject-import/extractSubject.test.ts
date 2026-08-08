import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GEMINI_MODEL, extractSubject } from "./extractSubject";

function field(value: unknown, status = "explicit", evidence: string | null = "根拠") {
  return { value, status, evidence };
}

const VALID_DRAFT = {
  subjectName: field("線形代数"),
  totalClassCount: field(15),
  attendanceRequiredRate: field(80),
  attendanceMaxAbsences: field(3),
  attendanceAffectsGrade: field(true),
  targetGradeLabel: field("B"),
  targetScore: field(80),
  gradeItems: [
    { name: field("中間"), category: field("test"), weight: field(100), maxScore: field(100) },
  ],
  detectedSubjectCount: 1,
};

/** GeminiのgenerateContent応答を模したレスポンスを作る。 */
function geminiResponse(text: string, finishReason = "STOP") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ finishReason, content: { parts: [{ text }] } }],
    }),
  } as unknown as Response;
}

function errorResponse(status: number) {
  return { ok: false, status, json: async () => ({}) } as unknown as Response;
}

const ORIGINAL_MODEL = process.env.GEMINI_MODEL;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  if (ORIGINAL_MODEL === undefined) {
    delete process.env.GEMINI_MODEL;
  } else {
    process.env.GEMINI_MODEL = ORIGINAL_MODEL;
  }
});

describe("extractSubject", () => {
  describe("正常系", () => {
    it("1回目で正しいJSONが返れば成功する", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_DRAFT)));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: true, draft: VALID_DRAFT, attempts: 1 });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("不正なJSONの次に正しいJSONが返れば成功する", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(geminiResponse("これはJSONではない"))
        .mockResolvedValueOnce(geminiResponse(JSON.stringify(VALID_DRAFT)));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result.ok).toBe(true);
      expect(result).toMatchObject({ attempts: 2 });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("構造化出力の設定を含むリクエストを送る", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_DRAFT)));

      await extractSubject("線形代数 全15回", { fetchImpl, apiKey: "test-key" });

      const [, init] = fetchImpl.mock.calls[0];
      const body = JSON.parse(init.body as string);

      expect(body.generationConfig.responseMimeType).toBe("application/json");
      expect(body.generationConfig.responseSchema).toBeDefined();
      expect(body.generationConfig.temperature).toBe(0);
      expect(body.contents[0].parts[0].text).toContain("線形代数 全15回");
    });

    it("APIキーをURLではなくヘッダで渡す", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_DRAFT)));

      await extractSubject("入力", { fetchImpl, apiKey: "secret-key" });

      const [url, init] = fetchImpl.mock.calls[0];

      expect(String(url)).not.toContain("secret-key");
      expect(init.headers["x-goog-api-key"]).toBe("secret-key");
    });

    it("既定のモデルを使う", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_DRAFT)));

      await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(String(fetchImpl.mock.calls[0][0])).toContain(DEFAULT_GEMINI_MODEL);
    });

    it("環境変数でモデルを差し替えられる", async () => {
      process.env.GEMINI_MODEL = "gemini-2.5-flash-lite";
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse(JSON.stringify(VALID_DRAFT)));

      await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(String(fetchImpl.mock.calls[0][0])).toContain("gemini-2.5-flash-lite");
    });
  });

  describe("異常系", () => {
    it("2回とも不正なJSONなら invalid_response を返し、3回目を呼ばない", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(geminiResponse("壊れた応答"));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "invalid_response" });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("スキーマに合わないJSONを再試行対象として扱う", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValue(geminiResponse(JSON.stringify({ subjectName: "文字列だけ" })));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "invalid_response" });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("finishReasonがSTOP以外なら再試行する", async () => {
      const fetchImpl = vi
        .fn()
        .mockResolvedValueOnce(geminiResponse(JSON.stringify(VALID_DRAFT), "MAX_TOKENS"))
        .mockResolvedValueOnce(geminiResponse(JSON.stringify(VALID_DRAFT)));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result.ok).toBe(true);
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    });

    it("APIキーが未設定ならfetchを呼ばない", async () => {
      const fetchImpl = vi.fn();

      const result = await extractSubject("入力", { fetchImpl, apiKey: "" });

      expect(result).toEqual({ ok: false, error: "not_configured" });
      expect(fetchImpl).not.toHaveBeenCalled();
    });

    it("タイムアウトしたら再試行せずに終了する", async () => {
      const abortError = new Error("The operation was aborted.");
      abortError.name = "AbortError";
      const fetchImpl = vi.fn().mockRejectedValue(abortError);

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "timeout" });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("HTTP 429なら provider_error を返し再試行しない", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(errorResponse(429));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "provider_error" });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    });

    it("HTTP 404（モデルID誤り）でも provider_error を返す", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(errorResponse(404));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "provider_error" });
    });

    it("ネットワークエラーなら provider_error を返す", async () => {
      const fetchImpl = vi.fn().mockRejectedValue(new TypeError("network failure"));

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "provider_error" });
    });

    it("候補が空の応答を再試行対象として扱う", async () => {
      const fetchImpl = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ candidates: [] }),
      } as unknown as Response);

      const result = await extractSubject("入力", { fetchImpl, apiKey: "test-key" });

      expect(result).toEqual({ ok: false, error: "invalid_response" });
    });

    it("入力本文をログへ出さない", async () => {
      const fetchImpl = vi.fn().mockResolvedValue(errorResponse(500));
      const errorSpy = vi.spyOn(console, "error");

      await extractSubject("秘密のシラバス本文", { fetchImpl, apiKey: "test-key" });

      for (const call of errorSpy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain("秘密のシラバス本文");
      }
    });
  });
});
