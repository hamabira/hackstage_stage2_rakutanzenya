import Link from "next/link";
import type { Subject } from "@/lib/types/domain";
import { Card } from "@/components/ui/Card";

export function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Link className="group block h-full" href={`/subjects/${subject.id}`}>
      <Card className="flex h-full min-h-44 flex-col group-hover:-translate-y-0.5 group-hover:border-[#c8ccc3] group-hover:shadow-md">
        <h3 className="font-display text-lg font-bold">{subject.name}</h3>
        <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-[#92988f]">総授業回数</dt>
            <dd className="mt-1 font-semibold">{subject.totalClassCount ?? "未設定"}回</dd>
          </div>
          <div>
            <dt className="text-xs text-[#92988f]">目標成績</dt>
            <dd className="mt-1 font-semibold">{subject.targetGradeLabel ?? "未設定"}</dd>
          </div>
        </dl>
        <span className="mt-auto pt-5 text-right text-sm font-bold text-[#337a24]">
          詳しく見る →
        </span>
      </Card>
    </Link>
  );
}
