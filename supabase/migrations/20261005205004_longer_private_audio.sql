-- Longer permitted lessons keep a private playback copy below Free's 50 MB
-- global ceiling. Existing MIME and access policies remain unchanged.
update storage.buckets set file_size_limit=48000000
where id='lesson-audio' and public=false;
