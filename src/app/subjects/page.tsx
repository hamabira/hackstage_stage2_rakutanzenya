import Link from "next/link";
import { getSubjectDashboardData } from "@/lib/supabase/queries/subjectDashboard";
import { SubjectsTable } from "@/components/subjects/SubjectsTable";

export default async function SubjectsPage() {
  const { subjects, gradeItemsMap, attendanceResults, gradeResults } =
    await getSubjectDashboardData();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">科目一覧</h1>
        <Link
          href="/subjects/new"
          className="rounded-md bg-black px-3 py-1.5 text-sm font-medium text-white"
        >
          科目を追加
        </Link>
      </div>

      <SubjectsTable
        subjects={subjects}
        gradeItemsMap={gradeItemsMap}
        attendanceResults={attendanceResults}
        gradeResults={gradeResults}
        context="subjects"
      />
    </div>
  );
}
