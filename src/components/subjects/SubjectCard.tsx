import Link from "next/link";
import type { Subject } from "@/lib/types/domain";
import { Card } from "@/components/ui/Card";

export function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Link href={`/subjects/${subject.id}`}>
      <Card className="hover:border-gray-400">
        <h3 className="font-medium">{subject.name}</h3>
        {subject.targetGradeLabel && (
          <p className="mt-1 text-sm text-gray-600">
            目標: {subject.targetGradeLabel}
          </p>
        )}
      </Card>
    </Link>
  );
}
