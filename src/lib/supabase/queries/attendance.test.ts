import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  deleteAttendanceRecord,
  getAttendanceRecords,
  saveAttendanceRecord,
} from "./attendance";

const RECORD_ROW = {
  id: "record-1",
  subject_id: "subject-1",
  class_date: "2026-04-10",
  status: "present" as const,
  memo: null,
};

type QueryResult = { data: unknown; error: { code?: string } | null };

/**
 * Supabaseのクエリビルダを模したスタブ。
 * メソッドチェーンを記録し、最後に await された時点で結果を返す。
 */
function createQueryStub(result: QueryResult) {
  const calls: Array<{ method: string; args: unknown[] }> = [];

  const builder: Record<string, unknown> = {
    then(resolve: (value: QueryResult) => unknown) {
      return Promise.resolve(result).then(resolve);
    },
  };

  for (const method of ["select", "eq", "order", "upsert", "delete", "single"]) {
    builder[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    };
  }

  return { builder, calls };
}

function mockSupabase(options: {
  authenticated?: boolean;
  result?: QueryResult;
}) {
  const { builder, calls } = createQueryStub(
    options.result ?? { data: RECORD_ROW, error: null },
  );
  const from = vi.fn(() => builder);

  mocks.createClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue(
        options.authenticated === false
          ? { data: { user: null }, error: { message: "no session" } }
          : { data: { user: { id: "user-1" } }, error: null },
      ),
    },
    from,
  });

  return { from, calls };
}

/** チェーン中の特定メソッドへ渡された引数を取り出す。 */
function findCall(
  calls: Array<{ method: string; args: unknown[] }>,
  method: string,
) {
  return calls.find((call) => call.method === method);
}

describe("attendance queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAttendanceRecords", () => {
    it("出席記録をドメイン型へ変換して返す", async () => {
      mockSupabase({ result: { data: [RECORD_ROW], error: null } });

      const result = await getAttendanceRecords("subject-1");

      expect(result).toEqual({
        ok: true,
        records: [
          {
            id: "record-1",
            subjectId: "subject-1",
            classDate: "2026-04-10",
            status: "present",
            memo: null,
          },
        ],
      });
    });

    it("授業日の昇順で取得する", async () => {
      const { from, calls } = mockSupabase({ result: { data: [], error: null } });

      await getAttendanceRecords("subject-1");

      expect(from).toHaveBeenCalledWith("attendance_records");
      expect(findCall(calls, "eq")?.args).toEqual(["subject_id", "subject-1"]);
      expect(findCall(calls, "order")?.args).toEqual([
        "class_date",
        { ascending: true },
      ]);
    });

    it("記録がない場合は空配列を返す", async () => {
      mockSupabase({ result: { data: null, error: null } });

      await expect(getAttendanceRecords("subject-1")).resolves.toEqual({
        ok: true,
        records: [],
      });
    });

    it("未認証ならクエリを投げずに終わる", async () => {
      const { from } = mockSupabase({ authenticated: false });

      const result = await getAttendanceRecords("subject-1");

      expect(result).toEqual({ ok: false, error: "unauthenticated" });
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe("saveAttendanceRecord", () => {
    const input = {
      subjectId: "subject-1",
      classDate: "2026-04-10",
      status: "absent" as const,
      memo: "体調不良",
    };

    it("同一科目・同一日付を競合キーにしてUPSERTする", async () => {
      const { calls } = mockSupabase({});

      await saveAttendanceRecord(input);

      expect(findCall(calls, "upsert")?.args).toEqual([
        {
          subject_id: "subject-1",
          user_id: "user-1",
          class_date: "2026-04-10",
          status: "absent",
          memo: "体調不良",
        },
        { onConflict: "subject_id,class_date" },
      ]);
    });

    it("user_id は認証済みセッションの値を使う", async () => {
      const { calls } = mockSupabase({});

      await saveAttendanceRecord(input);

      const payload = findCall(calls, "upsert")?.args[0] as { user_id: string };
      expect(payload.user_id).toBe("user-1");
    });

    it("保存した記録をドメイン型で返す", async () => {
      mockSupabase({});

      const result = await saveAttendanceRecord(input);

      expect(result).toEqual({
        ok: true,
        record: {
          id: "record-1",
          subjectId: "subject-1",
          classDate: "2026-04-10",
          status: "present",
          memo: null,
        },
      });
    });

    it("制約違反を constraint_violation として返す", async () => {
      mockSupabase({ result: { data: null, error: { code: "23514" } } });

      await expect(saveAttendanceRecord(input)).resolves.toEqual({
        ok: false,
        error: "constraint_violation",
      });
    });

    it("外部キー違反(存在しない科目)も constraint_violation として返す", async () => {
      mockSupabase({ result: { data: null, error: { code: "23503" } } });

      await expect(saveAttendanceRecord(input)).resolves.toEqual({
        ok: false,
        error: "constraint_violation",
      });
    });

    it("RLSで弾かれた場合など想定外のエラーは unknown を返す", async () => {
      mockSupabase({ result: { data: null, error: { code: "42501" } } });

      await expect(saveAttendanceRecord(input)).resolves.toEqual({
        ok: false,
        error: "unknown",
      });
    });

    it("未認証なら保存しない", async () => {
      const { from } = mockSupabase({ authenticated: false });

      const result = await saveAttendanceRecord(input);

      expect(result).toEqual({ ok: false, error: "unauthenticated" });
      expect(from).not.toHaveBeenCalled();
    });
  });

  describe("deleteAttendanceRecord", () => {
    it("idとuser_idの両方で絞り込んで削除する", async () => {
      const { calls } = mockSupabase({
        result: { data: [{ id: "record-1" }], error: null },
      });

      const result = await deleteAttendanceRecord("record-1");

      expect(result).toEqual({ ok: true });
      expect(calls.filter((call) => call.method === "eq").map((call) => call.args)).toEqual([
        ["id", "record-1"],
        ["user_id", "user-1"],
      ]);
    });

    it("他ユーザーの記録など削除対象がなければ not_found を返す", async () => {
      mockSupabase({ result: { data: [], error: null } });

      await expect(deleteAttendanceRecord("record-1")).resolves.toEqual({
        ok: false,
        error: "not_found",
      });
    });

    it("未認証なら削除しない", async () => {
      const { from } = mockSupabase({ authenticated: false });

      const result = await deleteAttendanceRecord("record-1");

      expect(result).toEqual({ ok: false, error: "unauthenticated" });
      expect(from).not.toHaveBeenCalled();
    });
  });
});
