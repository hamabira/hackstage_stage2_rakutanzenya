import type { Subject } from "@/lib/types/domain";
import { Button } from "@/components/ui/Button";

// TODO: 評価項目の動的追加フォーム実装は後続issueで行う(科目登録フォーム実装issue)
export function SubjectForm({ subject }: { subject?: Subject }) {
  return (
    <form className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        科目名
        <input
          type="text"
          name="name"
          defaultValue={subject?.name}
          className="rounded-md border px-3 py-2"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        総授業回数
        <input
          type="number"
          name="totalClassCount"
          defaultValue={subject?.totalClassCount ?? undefined}
          className="rounded-md border px-3 py-2"
        />
      </label>

      <p className="text-sm text-gray-500">
        評価項目(出席・課題・テストなど)の追加フォームは未実装です。
      </p>

      <Button type="submit">保存</Button>
    </form>
  );
}
