import type { Subject } from "@/lib/types/domain";
import { Card } from "@/components/ui/Card";

// TODO: 出席・成績の逆算結果表示は後続issueで行う(ダッシュボードトップの全体サマリ実装issue)
export function SubjectSummaryCard({ subject }: { subject: Subject }) {
  return (
    <Card>
      <h3 className="font-medium">{subject.name}</h3>
      <p className="mt-1 text-sm text-gray-500">計算結果は準備中です</p>
    </Card>
  );
}
