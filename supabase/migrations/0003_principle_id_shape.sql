-- principle_id is client-supplied on insert and was accepted as any string.
-- Two small consequences: orphan "edit" suggestions pointing at slugs that
-- don't exist, and a value like `x](https://evil)` flowing verbatim into the
-- GitHub notification issue as markdown. Constrain it to the slug shape the
-- PRINCIPLES array actually uses.
--
-- This does not verify the slug EXISTS — the principles live in source control,
-- not this database, so there is no table to reference. It only enforces the
-- format, which is enough to stop injection and obvious junk.

alter table public.suggestions
  add constraint principle_id_is_slug
  check (principle_id is null or principle_id ~ '^[a-z0-9-]{1,64}$');
