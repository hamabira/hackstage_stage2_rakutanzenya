import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
}));

import {
  createSubject,
  getSubject,
  updateSubject,
} from "./subjects";

const createInput = {
  name: "数学",
  totalClassCount: 15,
  attendanceRequiredRate: 80,
  attendanceMaxAbsences: null,
  attendanceAffectsGrade: false,
  targetGradeLabel: "A",
  targetScore: 90,
  gradeItems: [
    {
      name: "期末テスト",
      category: "test" as const,
      weight: 100,
      maxScore: 100,
      sortOrder: 0,
    },
  ],
};

function createAuthenticatedClient(options?: {
  rpcResult?: { data: string | null; error: { code?: string } | null };
  subjectResult?: { data: object | null; error: { code?: string } | null };
  gradeItemsResult?: { data: object[] | null; error: { code?: string } | null };
}) {
  const rpc = vi.fn().mockResolvedValue(options?.rpcResult ?? { data: "subject-1", error: null });
  const maybeSingle = vi.fn().mockResolvedValue(
    options?.subjectResult ?? {
      data: {
        id: "subject-1",
        user_id: "user-1",
        name: "数学",
        total_class_count: 15,
        attendance_required_rate: "80.00",
        attendance_max_absences: null,
        attendance_affects_grade: false,
        target_grade_label: "A",
        target_score: "90.00",
      },
      error: null,
    },
  );
  const order = vi.fn().mockResolvedValue(
    options?.gradeItemsResult ?? {
      data: [
        {
          id: "grade-item-1",
          subject_id: "subject-1",
          name: "期末テスト",
          category: "test",
          weight: "100.00",
          max_score: "100.00",
          sort_order: 0,
        },
      ],
      error: null,
    },
  );
  const from = vi.fn((table: string) => {
    if (table === "subjects") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle })),
        })),
      };
    }

    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ order })),
      })),
    };
  });

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } }, error: null }) },
    rpc,
    from,
  };
}

describe("subjects queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("新規作成時にcamelCase入力をsnake_caseのRPC引数へ変換する", async () => {
    const client = createAuthenticatedClient();
    mocks.createClient.mockResolvedValue(client);

    await expect(createSubject(createInput)).resolves.toEqual({ ok: true, subjectId: "subject-1" });

    expect(client.rpc).toHaveBeenCalledWith("create_subject_with_grade_items", {
      p_subject: {
        name: "数学",
        total_class_count: 15,
        attendance_required_rate: 80,
        attendance_max_absences: null,
        attendance_affects_grade: false,
        target_grade_label: "A",
        target_score: 90,
      },
      p_grade_items: [
        {
          name: "期末テスト",
          category: "test",
          weight: 100,
          max_score: 100,
          sort_order: 0,
        },
      ],
    });
  });

  it("更新時に既存項目IDと新規項目をRPCへ渡し、保存後の値を返す", async () => {
    const client = createAuthenticatedClient();
    mocks.createClient.mockResolvedValue(client);

    const result = await updateSubject("subject-1", {
      ...createInput,
      gradeItems: [
        { ...createInput.gradeItems[0], id: "grade-item-1", name: "期末試験" },
        {
          name: "レポート",
          category: "assignment",
          weight: 0,
          maxScore: 20,
          sortOrder: 1,
        },
      ],
    });

    expect(client.rpc).toHaveBeenCalledWith("update_subject_with_grade_items", {
      p_subject_id: "subject-1",
      p_subject: expect.objectContaining({ total_class_count: 15 }),
      p_grade_items: [
        expect.objectContaining({ id: "grade-item-1", name: "期末試験" }),
        expect.not.objectContaining({ id: expect.anything() }),
      ],
    });
    expect(result).toMatchObject({
      ok: true,
      subjectId: "subject-1",
      subject: { attendanceRequiredRate: 80, targetScore: 90 },
      gradeItems: [{ maxScore: 100, weight: 100 }],
    });
  });

  it("対象科目が取得できない場合はnot_foundを返す", async () => {
    const client = createAuthenticatedClient({
      subjectResult: { data: null, error: null },
    });
    mocks.createClient.mockResolvedValue(client);

    await expect(getSubject("other-subject")).resolves.toEqual({ ok: false, error: "not_found" });
  });

  it("未認証では保存を実行しない", async () => {
    const client = createAuthenticatedClient();
    client.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mocks.createClient.mockResolvedValue(client);

    await expect(createSubject(createInput)).resolves.toEqual({ ok: false, error: "unauthenticated" });
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("DB制約違反をconstraint_violationとして返す", async () => {
    const client = createAuthenticatedClient({
      rpcResult: { data: null, error: { code: "23514" } },
    });
    mocks.createClient.mockResolvedValue(client);

    await expect(createSubject(createInput)).resolves.toEqual({
      ok: false,
      error: "constraint_violation",
    });
  });
});
