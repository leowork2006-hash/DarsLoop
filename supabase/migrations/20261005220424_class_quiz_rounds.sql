-- Quiz rounds use only existing validated MCQs. No client role can read answers,
-- participant identities or attempts directly; verified app routes use service_role.
create table public.class_quiz_rounds (
 id uuid primary key default gen_random_uuid(),
 group_id uuid not null references public.groups(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 lesson_title text not null,version integer not null check(version>0),
 material_revision integer not null default 0 check(material_revision>=0),
 snapshot jsonb not null,items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 10),
 active boolean not null default true,created_at timestamptz not null default now()
);
create index class_quiz_rounds_group on public.class_quiz_rounds(group_id,active);
create index class_quiz_rounds_lesson on public.class_quiz_rounds(lesson_id);
create table public.class_quiz_participants (
 round_id uuid not null references public.class_quiz_rounds(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 alias text check(alias is null or length(alias) between 2 and 30),
 choices jsonb check(choices is null or jsonb_typeof(choices)='array'),
 correct integer check(correct between 0 and 10),
 primary key(round_id,user_id),check((choices is null)=(correct is null))
);
create unique index class_quiz_alias on public.class_quiz_participants(round_id,lower(alias)) where alias is not null;
alter table public.class_quiz_rounds enable row level security;
alter table public.class_quiz_participants enable row level security;
revoke all on public.class_quiz_rounds,public.class_quiz_participants from public,anon,authenticated;
grant all on public.class_quiz_rounds,public.class_quiz_participants to service_role;

create function darsloop_private.class_quiz_snapshot(p_payload jsonb) returns jsonb
 language sql immutable security invoker set search_path='' as $$
 select jsonb_build_object('version',p_payload->'version','materialRevision',coalesce(p_payload->'materialRevision','0'::jsonb),
  'sourceKind',coalesce(p_payload->'sourceKind','"audio"'::jsonb),'segments',p_payload->'segments',
  'pdfPages',coalesce(p_payload->'pdfPages','[]'::jsonb),'artifacts',p_payload->'artifacts')
$$;

create function darsloop_private.class_quiz_close() returns trigger
 language plpgsql security invoker set search_path='' as $$
begin
 if tg_table_name='shares' then
  update public.class_quiz_rounds set active=false where group_id=old.group_id and lesson_id=old.lesson_id;
 else
  update public.class_quiz_rounds set active=false where lesson_id=old.id;
 end if;
 return null;
end $$;
create trigger class_quiz_unshare after delete on public.shares for each row execute function darsloop_private.class_quiz_close();
create trigger class_quiz_reshare after update of version on public.shares for each row when(old.version is distinct from new.version) execute function darsloop_private.class_quiz_close();
create trigger class_quiz_source_changed after update on public.lessons for each row
 when(darsloop_private.class_quiz_snapshot(old.payload) is distinct from darsloop_private.class_quiz_snapshot(new.payload))
 execute function darsloop_private.class_quiz_close();

create function darsloop_private.class_quiz_view(p_user uuid,p_round uuid) returns jsonb
 language plpgsql security invoker set search_path='' as $$
declare r public.class_quiz_rounds;own public.class_quiz_participants;result jsonb;peers jsonb;questions jsonb;
begin
 select * into r from public.class_quiz_rounds where id=p_round and active;
 if r.id is null or not exists(select 1 from public.memberships where group_id=r.group_id and user_id=p_user)
  or not exists(select 1 from public.shares s join public.lessons l on l.id=s.lesson_id
    where s.group_id=r.group_id and l.id=r.lesson_id and s.version=l.version and l.version=r.version
    and coalesce((l.payload->>'demo')::boolean,false)=false
    and (l.payload->>'status'='ready' or l.payload->'materialPreparation' is not null)
    and darsloop_private.class_quiz_snapshot(l.payload)=r.snapshot) then raise exception 'quiz_access';end if;
 select * into own from public.class_quiz_participants where round_id=r.id and user_id=p_user;
 result=jsonb_build_object('id',r.id,'groupId',r.group_id,'lessonId',r.lesson_id,'lessonTitle',r.lesson_title,
  'version',r.version,'materialRevision',r.material_revision,'questionCount',jsonb_array_length(r.items),'createdAt',r.created_at,
  'joined',own.alias is not null,'submitted',own.choices is not null);
 if own.alias is null then return result;end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',value->'id','question',value->'question','choices',value->'choices') order by ordinality),'[]'::jsonb)
  into questions from jsonb_array_elements(r.items) with ordinality;
 select coalesce(jsonb_agg(jsonb_build_object('alias',p.alias,'correct',p.correct,'total',jsonb_array_length(r.items)) order by p.correct desc,lower(p.alias)),'[]'::jsonb)
  into peers from public.class_quiz_participants p join public.memberships m on m.group_id=r.group_id and m.user_id=p.user_id
  where p.round_id=r.id and p.alias is not null and p.choices is not null;
 result=result||jsonb_build_object('alias',own.alias,'questions',questions,'participants',peers);
 if own.choices is not null then result=result||jsonb_build_object('result',jsonb_build_object('correct',own.correct,'total',jsonb_array_length(r.items),'choices',own.choices,'items',r.items));end if;
 return result;
end $$;

-- One atomic service-only operation. The app supplies its verified account ID,
-- never an ID accepted from request JSON. A first submission is immutable.
create function public.darsloop_class_quiz(p_user uuid,p_action text,p_group uuid default null,p_round uuid default null,
 p_lesson uuid default null,p_snapshot jsonb default null,p_items jsonb default null,p_alias text default null,p_choices jsonb default null)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.class_quiz_rounds;l public.lessons;own public.class_quiz_participants;item jsonb;choice jsonb;correct_count integer=0;i integer=0;result jsonb='[]'::jsonb;v jsonb;
begin
 if p_user is null or p_action not in ('list','read','create','join','withdraw','submit') then raise exception 'quiz_access';end if;
 if p_action='list' then
  if not exists(select 1 from public.memberships where group_id=p_group and user_id=p_user) then raise exception 'quiz_access';end if;
  for r in select * from public.class_quiz_rounds where group_id=p_group and active order by created_at desc limit 20 loop
   begin
    v=darsloop_private.class_quiz_view(p_user,r.id);
    result=result||(v-'alias'-'questions'-'participants'-'result');
   exception when raise_exception then if sqlerrm<>'quiz_access' then raise;end if;end;
  end loop;
  return result;
 end if;
 if p_action='create' then
  -- Serialize creation so retrying cannot create a second attempt for the same material.
  perform pg_advisory_xact_lock(hashtextextended(p_group::text,0));
  if not exists(select 1 from public.groups g join public.memberships m on m.group_id=g.id and m.user_id=p_user where g.id=p_group and g.owner_id=p_user) then raise exception 'quiz_owner';end if;
  perform 1 from public.memberships where group_id=p_group and user_id=p_user for share;
  perform 1 from public.shares where group_id=p_group and lesson_id=p_lesson for share;
  select * into l from public.lessons where id=p_lesson for share;
  if l.id is null or l.payload->>'status'<>'ready' or coalesce((l.payload->>'demo')::boolean,false)
   or not exists(select 1 from public.shares where group_id=p_group and lesson_id=p_lesson and version=l.version) then raise exception 'quiz_access';end if;
  if p_snapshot is distinct from darsloop_private.class_quiz_snapshot(l.payload) then raise exception 'quiz_changed';end if;
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 10 then raise exception 'quiz_empty';end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then raise exception 'quiz_empty';end if;
  for item in select value from jsonb_array_elements(p_items) loop
   if item->>'kind'<>'quiz' or jsonb_typeof(item->'choices')<>'array' or jsonb_array_length(item->'choices') not between 2 and 4
    or not (item->'choices' ? (item->>'answer'))
    or not exists(select 1 from jsonb_array_elements(l.payload->'artifacts'->'practice') q where q->>'id'=item->>'id' and q->>'kind'='quiz'
      and q->'question'=item->'question' and q->'answer'=item->'answer' and q->'choices'=item->'choices' and q->'evidence'=item->'evidence') then raise exception 'quiz_empty';end if;
  end loop;
  select * into r from public.class_quiz_rounds where group_id=p_group and lesson_id=p_lesson and active and snapshot=p_snapshot order by created_at desc limit 1;
  if r.id is null then
   if (select count(*) from public.class_quiz_rounds where group_id=p_group and active)>=20 then raise exception 'quiz_limit';end if;
   insert into public.class_quiz_rounds(group_id,lesson_id,lesson_title,version,material_revision,snapshot,items)
    values(p_group,p_lesson,l.payload->>'title',l.version,coalesce((l.payload->>'materialRevision')::integer,0),p_snapshot,p_items) returning * into r;
  end if;
  return darsloop_private.class_quiz_view(p_user,r.id);
 end if;
 -- Access is checked even for withdrawal and retry; ownership never bypasses a revoked share.
 v=darsloop_private.class_quiz_view(p_user,p_round);
 if p_action='read' then return v;end if;
 select * into r from public.class_quiz_rounds where id=p_round;
 perform 1 from public.memberships where group_id=r.group_id and user_id=p_user for share;
 perform 1 from public.shares where group_id=r.group_id and lesson_id=r.lesson_id for share;
 perform 1 from public.lessons where id=r.lesson_id for share;
 select * into r from public.class_quiz_rounds where id=p_round for update;
 v=darsloop_private.class_quiz_view(p_user,p_round);
 select * into own from public.class_quiz_participants where round_id=p_round and user_id=p_user;
 if p_action='join' then
  if p_alias is null or length(btrim(p_alias)) not between 2 and 30 or p_alias<>btrim(p_alias) or p_alias~'[<>@[:cntrl:]]' or p_alias~'[0-9]{7}' then raise exception 'quiz_alias';end if;
  if exists(select 1 from public.class_quiz_participants where round_id=p_round and lower(alias)=lower(p_alias) and user_id<>p_user) then raise exception 'quiz_alias';end if;
  insert into public.class_quiz_participants(round_id,user_id,alias) values(p_round,p_user,p_alias)
   on conflict(round_id,user_id) do update set alias=excluded.alias;
 elsif p_action='withdraw' then
  update public.class_quiz_participants set alias=null where round_id=p_round and user_id=p_user;
 elsif p_action='submit' then
  if own.alias is null then raise exception 'quiz_optin';end if;
  if p_choices is null or jsonb_typeof(p_choices)<>'array' or jsonb_array_length(p_choices)<>jsonb_array_length(r.items) then raise exception 'quiz_answers';end if;
  for choice in select value from jsonb_array_elements(p_choices) loop
   item=r.items->i;
   if jsonb_typeof(choice)<>'number' or choice::text !~ '^[0-3]$' or (choice::text)::integer>=jsonb_array_length(item->'choices') then raise exception 'quiz_answers';end if;
   if item->'choices'->((choice::text)::integer)=item->'answer' then correct_count=correct_count+1;end if;
   i=i+1;
  end loop;
  if own.choices is not null and own.choices<>p_choices then raise exception 'quiz_submitted';end if;
  if own.choices is null then update public.class_quiz_participants set choices=p_choices,correct=correct_count where round_id=p_round and user_id=p_user and choices is null;end if;
 end if;
 return darsloop_private.class_quiz_view(p_user,p_round);
end $$;
revoke all on function darsloop_private.class_quiz_snapshot(jsonb),darsloop_private.class_quiz_close(),darsloop_private.class_quiz_view(uuid,uuid),public.darsloop_class_quiz(uuid,text,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function darsloop_private.class_quiz_snapshot(jsonb),darsloop_private.class_quiz_close(),darsloop_private.class_quiz_view(uuid,uuid),public.darsloop_class_quiz(uuid,text,uuid,uuid,uuid,jsonb,jsonb,text,jsonb) to service_role;
