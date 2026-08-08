import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  createTestRecord,
  deleteTestRecord,
  getTestRecordsByGradeItemId,
  getTestRecordsBySubjectId,
  updateTestRecord,
} from "./grades";

const gradeItem = { id: "grade-item-1", max_score: "100.00" };
const record = {
  id: "record-1",
  grade_item_id: "grade-item-1",
  score: "80.50",
  recorded_at: "2026-08-08",
  memo: "中間試験",
};

function authenticatedClient(from: ReturnType<typeof vi.fn>) {
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    from,
  };
}

function gradeItemSelect(result: { data: object | null; error: { code?: string } | null }) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue(result) })),
    })),
  };
}

describe("grades queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("満点以下の得点を登録し、DB行をTestRecordへ変換する", async () => {
    const insertedRecord = { ...record, score: "100.00" };
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: insertedRecord, error: null }) })),
    }));
    const from = vi.fn((table: string) =>
      table === "grade_items"
        ? gradeItemSelect({ data: gradeItem, error: null })
        : { insert },
    );
    const client = authenticatedClient(from);
    mocks.createClient.mockResolvedValue(client);

    await expect(
      createTestRecord({
        gradeItemId: "grade-item-1",
        score: 100,
        recordedAt: "2026-08-08",
        memo: "中間試験",
      }),
    ).resolves.toEqual({
      ok: true,
      record: { id: "record-1", gradeItemId: "grade-item-1", score: 100, recordedAt: "2026-08-08", memo: "中間試験" },
    });

    expect(insert).toHaveBeenCalledWith({
      grade_item_id: "grade-item-1",
      user_id: "user-1",
      score: 100,
      recorded_at: "2026-08-08",
      memo: "中間試験",
    });
  });

  it.each([-1, 100.01, Number.NaN])("不正な得点 %p は保存前に拒否する", async (score) => {
    const from = vi.fn(() => gradeItemSelect({ data: gradeItem, error: null }));
    const client = authenticatedClient(from);
    mocks.createClient.mockResolvedValue(client);

    await expect(
      createTestRecord({ gradeItemId: "grade-item-1", score, recordedAt: "2026-08-08", memo: null }),
    ).resolves.toEqual({ ok: false, error: "invalid_score" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("満点未設定の評価項目には得点を登録しない", async () => {
    const from = vi.fn(() => gradeItemSelect({ data: { ...gradeItem, max_score: null }, error: null }));
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(
      createTestRecord({ gradeItemId: "grade-item-1", score: 80, recordedAt: "2026-08-08", memo: null }),
    ).resolves.toEqual({ ok: false, error: "missing_max_score" });
  });

  it("科目に紐づく複数の得点記録を記録日順で取得する", async () => {
    const records = [record, { ...record, id: "record-2", score: "70.00", recorded_at: "2026-08-09" }];
    const orderById = vi.fn().mockResolvedValue({ data: records, error: null });
    const orderByDate = vi.fn(() => ({ order: orderById }));
    const inGradeItems = vi.fn(() => ({ order: orderByDate }));
    const from = vi.fn((table: string) => {
      if (table === "subjects") {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "subject-1" }, error: null }) })) })),
        };
      }

      if (table === "grade_items") {
        return { select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [{ id: "grade-item-1" }], error: null }) })) };
      }

      return { select: vi.fn(() => ({ in: inGradeItems })) };
    });
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(getTestRecordsBySubjectId("subject-1")).resolves.toEqual({
      ok: true,
      records: [
        { id: "record-1", gradeItemId: "grade-item-1", score: 80.5, recordedAt: "2026-08-08", memo: "中間試験" },
        { id: "record-2", gradeItemId: "grade-item-1", score: 70, recordedAt: "2026-08-09", memo: "中間試験" },
      ],
    });
    expect(inGradeItems).toHaveBeenCalledWith("grade_item_id", ["grade-item-1"]);
  });

  it("他人の評価項目は取得できない", async () => {
    const from = vi.fn(() => gradeItemSelect({ data: null, error: null }));
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(getTestRecordsByGradeItemId("other-grade-item")).resolves.toEqual({
      ok: false,
      error: "not_found",
    });
  });

  it("自分の得点記録は満点確認後に更新できる", async () => {
    const updatedRecord = { ...record, score: "95.00", memo: null };
    const testRecordsFrom = {
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: record, error: null }) })) })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: updatedRecord, error: null }) })),
        })),
      })),
    };
    const from = vi.fn((table: string) =>
      table === "grade_items" ? gradeItemSelect({ data: gradeItem, error: null }) : testRecordsFrom,
    );
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(
      updateTestRecord("record-1", { score: 95, recordedAt: "2026-08-08", memo: null }),
    ).resolves.toEqual({
      ok: true,
      record: { id: "record-1", gradeItemId: "grade-item-1", score: 95, recordedAt: "2026-08-08", memo: null },
    });
  });

  it("他人の得点記録は更新できず、更新クエリを実行しない", async () => {
    const update = vi.fn();
    const from = vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      })),
      update,
    }));
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(
      updateTestRecord("other-record", { score: 80, recordedAt: "2026-08-08", memo: null }),
    ).resolves.toEqual({ ok: false, error: "not_found" });
    expect(update).not.toHaveBeenCalled();
  });

  it("自分の得点記録を削除でき、未ログイン時は削除しない", async () => {
    const remove = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { id: "record-1" }, error: null }) })),
      })),
    }));
    const from = vi.fn(() => ({ delete: remove }));
    const client = authenticatedClient(from);
    mocks.createClient.mockResolvedValue(client);

    await expect(deleteTestRecord("record-1")).resolves.toEqual({ ok: true });

    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(deleteTestRecord("record-1")).resolves.toEqual({ ok: false, error: "unauthenticated" });
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("他人の得点記録は削除できない", async () => {
    const remove = vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) })),
      })),
    }));
    const from = vi.fn(() => ({ delete: remove }));
    mocks.createClient.mockResolvedValue(authenticatedClient(from));

    await expect(deleteTestRecord("other-record")).resolves.toEqual({ ok: false, error: "not_found" });
  });
});
