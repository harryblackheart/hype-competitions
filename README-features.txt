# Extra SQL for purchase history

Run this in the Supabase SQL Editor:

```sql
create table purchases (
  id bigint primary key generated always as identity,
  email text not null,
  title text,
  tickets text,
  qty int,
  total numeric,
  is_instant boolean default false,
  created_at timestamptz default now()
);

alter table purchases enable row level security;
create policy "public all" on purchases for all using (true) with check (true);
```

Then upload the new app.js, index.html and styles.css.
