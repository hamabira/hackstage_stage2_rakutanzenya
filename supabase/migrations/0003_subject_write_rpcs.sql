-- 科目と評価項目を同一トランザクションで保存するRPC。
-- 0002_add_data_integrity_constraints.sql を適用した後に実行する。

create or replace function public.create_subject_with_grade_items(
  p_subject jsonb,
  p_grade_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_subject_id uuid;
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_subject) <> 'object' or jsonb_typeof(p_grade_items) <> 'array' then
    raise exception 'invalid subject payload' using errcode = '22023';
  end if;

  insert into public.subjects (
    user_id,
    name,
    total_class_count,
    attendance_required_rate,
    attendance_max_absences,
    attendance_affects_grade,
    target_grade_label,
    target_score
  )
  values (
    v_user_id,
    p_subject ->> 'name',
    (p_subject ->> 'total_class_count')::integer,
    (p_subject ->> 'attendance_required_rate')::numeric,
    (p_subject ->> 'attendance_max_absences')::integer,
    (p_subject ->> 'attendance_affects_grade')::boolean,
    p_subject ->> 'target_grade_label',
    (p_subject ->> 'target_score')::numeric
  )
  returning id into v_subject_id;

  insert into public.grade_items (
    subject_id,
    name,
    category,
    weight,
    max_score,
    sort_order
  )
  select
    v_subject_id,
    item.name,
    item.category,
    item.weight,
    item.max_score,
    item.sort_order
  from jsonb_to_recordset(p_grade_items) as item(
    name text,
    category text,
    weight numeric,
    max_score numeric,
    sort_order integer
  );

  return v_subject_id;
end;
$$;

create or replace function public.update_subject_with_grade_items(
  p_subject_id uuid,
  p_subject jsonb,
  p_grade_items jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_subject_id uuid;
  v_requested_existing_count integer;
  v_owned_existing_count integer;
begin
  if v_user_id is null then
    raise exception 'authentication is required' using errcode = '42501';
  end if;

  if jsonb_typeof(p_subject) <> 'object' or jsonb_typeof(p_grade_items) <> 'array' then
    raise exception 'invalid subject payload' using errcode = '22023';
  end if;

  update public.subjects
  set
    name = p_subject ->> 'name',
    total_class_count = (p_subject ->> 'total_class_count')::integer,
    attendance_required_rate = (p_subject ->> 'attendance_required_rate')::numeric,
    attendance_max_absences = (p_subject ->> 'attendance_max_absences')::integer,
    attendance_affects_grade = (p_subject ->> 'attendance_affects_grade')::boolean,
    target_grade_label = p_subject ->> 'target_grade_label',
    target_score = (p_subject ->> 'target_score')::numeric
  where id = p_subject_id
    and user_id = v_user_id
  returning id into v_subject_id;

  if not found then
    raise exception 'subject not found' using errcode = 'P0002';
  end if;

  select count(*)
  into v_requested_existing_count
  from jsonb_to_recordset(p_grade_items) as item(id uuid)
  where item.id is not null;

  select count(*)
  into v_owned_existing_count
  from jsonb_to_recordset(p_grade_items) as item(id uuid)
  join public.grade_items as grade_item
    on grade_item.id = item.id
   and grade_item.subject_id = v_subject_id
  where item.id is not null;

  if v_requested_existing_count <> v_owned_existing_count then
    raise exception 'grade item does not belong to subject' using errcode = '42501';
  end if;

  update public.grade_items as grade_item
  set
    name = item.name,
    category = item.category,
    weight = item.weight,
    max_score = item.max_score,
    sort_order = item.sort_order
  from jsonb_to_recordset(p_grade_items) as item(
    id uuid,
    name text,
    category text,
    weight numeric,
    max_score numeric,
    sort_order integer
  )
  where grade_item.id = item.id
    and grade_item.subject_id = v_subject_id;

  insert into public.grade_items (
    subject_id,
    name,
    category,
    weight,
    max_score,
    sort_order
  )
  select
    v_subject_id,
    item.name,
    item.category,
    item.weight,
    item.max_score,
    item.sort_order
  from jsonb_to_recordset(p_grade_items) as item(
    id uuid,
    name text,
    category text,
    weight numeric,
    max_score numeric,
    sort_order integer
  )
  where item.id is null;

  delete from public.grade_items as grade_item
  where grade_item.subject_id = v_subject_id
    and not exists (
      select 1
      from jsonb_to_recordset(p_grade_items) as item(id uuid)
      where item.id = grade_item.id
    );

  return v_subject_id;
end;
$$;

revoke all on function public.create_subject_with_grade_items(jsonb, jsonb) from public;
revoke all on function public.update_subject_with_grade_items(uuid, jsonb, jsonb) from public;

grant execute on function public.create_subject_with_grade_items(jsonb, jsonb) to authenticated;
grant execute on function public.update_subject_with_grade_items(uuid, jsonb, jsonb) to authenticated;
