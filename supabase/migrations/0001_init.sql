-- 科目
create table subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  -- 出席条件系
  total_class_count integer,
  attendance_required_rate numeric(5,2),
  attendance_max_absences integer,
  attendance_affects_grade boolean not null default false,
  -- 目標成績
  target_grade_label text,
  target_score numeric(5,2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 評価項目(出席/課題/テストなどの重み付け)
create table grade_items (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  name text not null,
  category text not null check (category in ('attendance', 'assignment', 'test', 'other')),
  weight numeric(5,2) not null default 0,
  max_score numeric(6,2),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 出席記録
create table attendance_records (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references subjects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  class_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused')),
  memo text,
  created_at timestamptz not null default now()
);

-- 課題/テスト実績(grade_itemsに紐づく点数記録)
create table test_records (
  id uuid primary key default gen_random_uuid(),
  grade_item_id uuid not null references grade_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(6,2) not null,
  recorded_at date not null default current_date,
  memo text,
  created_at timestamptz not null default now()
);

-- インデックス
create index idx_subjects_user_id on subjects(user_id);
create index idx_grade_items_subject_id on grade_items(subject_id);
create index idx_attendance_subject_id on attendance_records(subject_id);
create index idx_test_records_grade_item_id on test_records(grade_item_id);

-- updated_at自動更新
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_subjects_updated_at
before update on subjects
for each row execute function set_updated_at();

-- RLS(行レベルセキュリティ): 本人データのみアクセス可能
alter table subjects enable row level security;
alter table grade_items enable row level security;
alter table attendance_records enable row level security;
alter table test_records enable row level security;

create policy "subjects_owner_all" on subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "attendance_records_owner_all" on attendance_records
  for all using (
    auth.uid() = user_id
    and exists (
      select 1 from subjects s
      where s.id = attendance_records.subject_id and s.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id
    and exists (
      select 1 from subjects s
      where s.id = attendance_records.subject_id and s.user_id = auth.uid()
    )
  );

create policy "test_records_owner_all" on test_records
  for all using (
    auth.uid() = user_id
    and exists (
      select 1
      from grade_items gi
      join subjects s on s.id = gi.subject_id
      where gi.id = test_records.grade_item_id and s.user_id = auth.uid()
    )
  ) with check (
    auth.uid() = user_id
    and exists (
      select 1
      from grade_items gi
      join subjects s on s.id = gi.subject_id
      where gi.id = test_records.grade_item_id and s.user_id = auth.uid()
    )
  );

-- grade_itemsはsubjects経由でuser_idを引く
create policy "grade_items_owner_select" on grade_items
  for select using (
    exists (select 1 from subjects s where s.id = grade_items.subject_id and s.user_id = auth.uid())
  );

create policy "grade_items_owner_modify" on grade_items
  for all using (
    exists (select 1 from subjects s where s.id = grade_items.subject_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from subjects s where s.id = grade_items.subject_id and s.user_id = auth.uid())
  );
