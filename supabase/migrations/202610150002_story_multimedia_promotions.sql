alter table public.stories
  add column if not exists body text,
  add column if not exists is_trending boolean not null default false,
  add column if not exists is_breaking boolean not null default false;

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'video/mp4','video/webm','video/ogg','video/quicktime',
  'audio/mpeg','audio/mp4','audio/aac','audio/wav','audio/x-wav',
  'audio/ogg','audio/webm','audio/flac'
]
where id = 'editorial-media';
