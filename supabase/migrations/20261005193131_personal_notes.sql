-- Personal writing is never added to the lesson payload, retrieval, or practice.
create table public.personal_notes (
 user_id uuid not null references auth.users(id) on delete cascade,
 lesson_id uuid not null references public.lessons(id) on delete cascade,
 version integer not null check(version>0),
 revision integer not null check(revision>0),
 text text not null check(length(text)<=20000),
 view text not null check(view in ('summary','points','detailed')),
 updated_at timestamptz not null default now(),
 primary key(user_id,lesson_id,version)
);
create index personal_notes_lesson on public.personal_notes(lesson_id);
alter table public.personal_notes enable row level security;
revoke all on public.personal_notes from public,anon,authenticated;
grant select on public.personal_notes to authenticated;
grant all on public.personal_notes to service_role;
create policy personal_notes_read on public.personal_notes for select to authenticated
 using (
  user_id=(select auth.uid())
  and darsloop_private.can_read(lesson_id,(select auth.uid()))
  and exists(select 1 from public.lessons l where l.id=lesson_id and l.version=personal_notes.version)
 );

-- The server derives p_user from its verified session. Clients cannot execute
-- this service-only function or write directly. SECURITY INVOKER preserves the
-- caller's role; the existing private can_read helper also checks that role.
create function public.darsloop_save_personal_notes(p_user uuid,p_lesson uuid,p_version integer,p_revision integer,p_text text,p_view text)
 returns jsonb language plpgsql security invoker set search_path='' as $$
declare current_version integer; previous_revision integer; result jsonb;
begin
 if p_user is null or p_lesson is null or p_version is null or p_version<1 or p_revision is null or p_revision<0 or p_revision>=2147483647 or p_text is null or length(p_text)>20000 or p_view is null or p_view not in ('summary','points','detailed') then
  raise exception 'note_invalid';
 end if;
 -- Serialize saves for this student's version, including the first insert.
 perform pg_advisory_xact_lock(hashtextextended(p_user::text||p_lesson::text||p_version::text,0));
 select version into current_version from public.lessons where id=p_lesson for share;
 if current_version is null or not darsloop_private.can_read(p_lesson,p_user) then raise exception 'note_access';end if;
 if current_version<>p_version then raise exception 'note_changed';end if;
 select revision into previous_revision from public.personal_notes where user_id=p_user and lesson_id=p_lesson and version=p_version;
 if coalesce(previous_revision,0)<>p_revision then raise exception 'note_conflict';end if;
 insert into public.personal_notes(user_id,lesson_id,version,revision,text,view,updated_at)
 values(p_user,p_lesson,p_version,p_revision+1,p_text,p_view,now())
 on conflict(user_id,lesson_id,version) do update set revision=excluded.revision,text=excluded.text,view=excluded.view,updated_at=excluded.updated_at;
 select jsonb_build_object('version',version,'revision',revision,'text',text,'view',view,'updatedAt',updated_at) into result
 from public.personal_notes where user_id=p_user and lesson_id=p_lesson and version=p_version;
 return result;
end $$;
revoke all on function public.darsloop_save_personal_notes(uuid,uuid,integer,integer,text,text) from public,anon,authenticated;
grant execute on function public.darsloop_save_personal_notes(uuid,uuid,integer,integer,text,text) to service_role;
