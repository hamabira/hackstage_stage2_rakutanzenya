-- 既存の 0001_init.sql を適用済みの環境へ、データ整合性制約を追加する。
-- 実行前にPRに記載した事前確認SQLを実行し、
-- 制約違反の既存データがない状態にしてから実行すること。

-- subjects
alter table subjects
  alter column total_class_count set not null,
  add constraint subjects_total_class_count_positive
    check (total_class_count > 0),
  add constraint subjects_attendance_required_rate_range
    check (
      attendance_required_rate is null
      or attendance_required_rate between 0 and 100
    ),
  add constraint subjects_attendance_max_absences_range
    check (
      attendance_max_absences is null
      or (
        attendance_max_absences >= 0
        and attendance_max_absences <= total_class_count
      )
    ),
  add constraint subjects_target_score_range
    check (target_score is null or target_score between 0 and 100);

-- grade_items
alter table grade_items
  add constraint grade_items_weight_range
    check (weight between 0 and 100),
  add constraint grade_items_max_score_positive
    check (max_score is null or max_score > 0);

-- test_records
alter table test_records
  add constraint test_records_score_nonnegative
    check (score >= 0);

-- 同一科目・同一日付の出席記録を一意にする。
-- 保存処理では onConflict: "subject_id,class_date" を指定して UPSERT できる。
alter table attendance_records
  add constraint attendance_records_subject_id_class_date_key
    unique (subject_id, class_date);

-- 上の一意制約が subject_id を先頭列とするインデックスを作成するため、
-- 既存の単体インデックスは重複する。
drop index if exists idx_attendance_subject_id;
