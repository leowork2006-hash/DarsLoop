create function public.darsloop_vectors(p_lesson uuid,p_version integer,p_model text,p_dimensions integer,p_batch jsonb,p_segments jsonb) returns void language plpgsql security definer set search_path='' as $$
begin
 perform id from public.lessons where id=p_lesson and version=p_version and payload->'segments'=p_segments for update;
 if not found then raise exception 'Lesson changed during indexing';end if;
 insert into public.search_vectors(lesson_id,version,model,dimensions,chunk_hash,vector) select p_lesson,p_version,p_model,p_dimensions,b->>'hash',b->'vector' from jsonb_array_elements(p_batch) b on conflict(lesson_id,version,model,dimensions,chunk_hash) do update set vector=excluded.vector;
end $$;
revoke all on function public.darsloop_vectors(uuid,integer,text,integer,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.darsloop_vectors(uuid,integer,text,integer,jsonb,jsonb) to service_role;
