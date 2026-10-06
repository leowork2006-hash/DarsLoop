-- V35: note detail and language are independent; same-language duplicates reuse prepared material.
-- Material-only action. Existing lesson/job rows are retained; source identity
-- and personal notes are never rewritten. API supplies a server-built source
-- snapshot and the same source guard used by local processing.
create or replace function public.darsloop_queue_detailed_material(
 p_owner uuid,p_lesson uuid,p_source_version integer,p_material_revision integer,
 p_source_snapshot jsonb,p_source_ready boolean,p_note_options jsonb,p_prepared_revision text
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 current_payload jsonb;
 current_version integer;
 current_revision integer;
 job_status text;
 active_job boolean;
 source_snapshot jsonb;
 queued_id uuid;
 next_payload jsonb;
 prepared boolean;
begin
 if p_note_options is null or jsonb_typeof(p_note_options)<>'object' or p_note_options->>'enabled' is distinct from 'true' or p_note_options->>'detail' is distinct from 'detailed' or coalesce(p_note_options->>'language','') not in ('auto','ar','ur','en') then return jsonb_build_object('error','conflict');end if;
 if p_source_version is null or p_source_version<1 or p_material_revision is null or p_material_revision<0 or p_material_revision>=2147483647 then
  return jsonb_build_object('error','conflict');
 end if;
 -- Matches the existing ordinary queue lock, preventing its terminal-job
 -- reset from racing this operation. Worker commits lock job before lesson.
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,0));
 select j.status into job_status from public.jobs j
 where j.lesson_id=p_lesson and exists(select 1 from public.lessons l where l.id=p_lesson and l.owner_id=p_owner)
 for update;
 active_job:=coalesce(job_status in ('queued','running'),false);
 if active_job then
  -- Active jobs are never mutated. A plain read avoids inverting the expired
  -- job cleanup lock order while returning duplicate/busy results.
  select l.payload,l.version into current_payload,current_version from public.lessons l where l.id=p_lesson and l.owner_id=p_owner;
 else
  select l.payload,l.version into current_payload,current_version from public.lessons l where l.id=p_lesson and l.owner_id=p_owner for update;
 end if;
 if current_payload is null or coalesce((current_payload->>'demo')::boolean,false) or coalesce((current_payload->>'shared')::boolean,false) then return jsonb_build_object('error','not_found');end if;
 if current_version<>p_source_version then return jsonb_build_object('error','conflict');end if;
 if coalesce(current_payload->>'materialRevision','0') !~ '^[0-9]{1,10}$' or coalesce(current_payload->>'materialRevision','0')::numeric>=2147483647 then return jsonb_build_object('error','conflict');end if;
 current_revision:=coalesce(current_payload->>'materialRevision','0')::integer;
 source_snapshot:=jsonb_build_object(
  'sourceKind',coalesce(current_payload->>'sourceKind','audio'),
  'duration',current_payload->'duration','audioPath',current_payload->'audioPath','mime',current_payload->'mime',
  'segments',current_payload->'segments','pdfPages',coalesce(current_payload->'pdfPages','[]'::jsonb),
  'sourcePageCount',current_payload->'sourcePageCount',
  'transcriptionComplete',coalesce((current_payload->>'transcriptionComplete')::boolean,false),
  'sourceImport',current_payload->'sourceImport','studyLanguage',coalesce(current_payload->'noteOptions'->>'language','auto'),
  'spokenLanguage',coalesce(current_payload->>'spokenLanguage','auto'),
  'transcriptCache',current_payload->'transcriptCache'
 );
 if p_source_snapshot is null or source_snapshot<>p_source_snapshot then return jsonb_build_object('error','conflict');end if;
 if current_revision=p_material_revision and active_job and current_payload->>'status' in ('queued','processing')
  and current_payload->'materialPreparation'->>'kind'='detailed'
  and current_payload->'materialPreparation'->>'revision'=(current_revision+1)::text
  and (p_note_options->>'language'='auto' or current_payload->'materialPreparation'->'noteOptions'->>'language'=p_note_options->>'language') then
  return jsonb_build_object('status','already_queued','revision',current_revision+1);
 end if;
 if not active_job and current_payload->>'status' in ('ready','failed') and not coalesce(p_source_ready,false) then return jsonb_build_object('error','source_not_ready');end if;
 prepared:=coalesce(current_payload->'artifacts'->'preparation'->>'revision'=p_prepared_revision,false)
  and coalesce(current_payload->'artifacts'->'preparation'->>'detail'='detailed',false)
  and coalesce((current_payload->'noteOptions'->>'enabled')::boolean,true)
  and (p_note_options->>'language'='auto' or coalesce(current_payload->'artifacts'->>'language',nullif(current_payload->'noteOptions'->>'language','auto'))=p_note_options->>'language')
  and jsonb_array_length(case when jsonb_typeof(current_payload->'artifacts'->'notes')='array' then current_payload->'artifacts'->'notes' else '[]'::jsonb end)>0;
 if current_payload->>'status'='ready' and not active_job and prepared and current_revision in (p_material_revision,p_material_revision+1) then
  return jsonb_build_object('status','already_prepared','revision',current_revision);
 end if;
 if current_revision<>p_material_revision then return jsonb_build_object('error','conflict');end if;
 if active_job or current_payload->>'status' in ('queued','processing') then return jsonb_build_object('error','busy');end if;
 if current_payload->>'status' not in ('ready','failed') or not coalesce(p_source_ready,false) then return jsonb_build_object('error','source_not_ready');end if;
 if p_note_options is null or jsonb_typeof(p_note_options)<>'object' or p_note_options->>'enabled' is distinct from 'true' or p_note_options->>'detail' is distinct from 'detailed' or coalesce(p_note_options->>'language','') not in ('auto','ar','ur','en') then return jsonb_build_object('error','conflict');end if;
 insert into public.jobs(id,lesson_id,status,attempts,available_at)
 values(gen_random_uuid(),p_lesson,'queued',0,now())
 on conflict(lesson_id) do update set status='queued',lease=null,lease_until=null,error=null,attempts=0,available_at=now()
 where jobs.status in ('failed','done') returning id into queued_id;
 if queued_id is null then return jsonb_build_object('error','busy');end if;
 next_payload:=(current_payload-'nextAttemptAt'-'quotaDeferrals'-'materialFailure')||jsonb_build_object(
  'status','queued','error',null,'stage','Waiting to prepare detailed notes',
  'materialPreparation',jsonb_build_object('kind','detailed','revision',current_revision+1,'noteOptions',p_note_options,'requestedAt',now())
 );
 update public.lessons set payload=next_payload where id=p_lesson and owner_id=p_owner and version=p_source_version;
 if not found then raise exception 'Lesson changed during material queueing';end if;
 return jsonb_build_object('status','queued','revision',current_revision+1);
end $$;
revoke all on function public.darsloop_queue_detailed_material(uuid,uuid,integer,integer,jsonb,boolean,jsonb,text) from public,anon,authenticated;
grant execute on function public.darsloop_queue_detailed_material(uuid,uuid,integer,integer,jsonb,boolean,jsonb,text) to service_role;

