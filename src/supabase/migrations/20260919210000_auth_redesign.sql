-- Username/password auth with synthetic Supabase email identities.
alter table public.profiles
  alter column phone drop not null,
  add column if not exists username text,
  add column if not exists first_name text,
  add column if not exists last_name text;

update public.profiles
set username = coalesce(username, lower(regexp_replace(split_part(phone, '@', 1), '[^a-zA-Z0-9_]', '', 'g')) || '_' || left(id::text, 6)),
    first_name = coalesce(first_name, split_part(name, ' ', 1)),
    last_name = coalesce(last_name, nullif(trim(substr(name, length(split_part(name, ' ', 1)) + 1)), ''), split_part(name, ' ', 1))
where username is null;

alter table public.profiles
  alter column username set not null,
  alter column first_name set not null,
  alter column last_name set not null;
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.addresses add column if not exists phone text;
-- Existing fixtures are reset by the parent; this keeps the migration applicable
-- to a database that still has legacy rows.
update public.addresses a set phone = coalesce(p.phone, '+201000000000')
from public.profiles p where p.id = a.user_id and a.phone is null;
alter table public.addresses alter column phone set not null;

create unique index if not exists id_verifications_national_hash_idx
  on public.id_verifications (national_id_hash);

create or replace function public.fn_bootstrap_user(p_user_id uuid, p_phone text, p_name text)
returns void language plpgsql security definer set search_path = public as $$
declare v_first text := split_part(trim(p_name), ' ', 1);
declare v_last text := nullif(trim(substr(trim(p_name), length(v_first) + 1)), '');
declare v_username text := lower(regexp_replace(coalesce(p_phone, 'user_' || left(p_user_id::text, 8)), '[^a-zA-Z0-9_]', '', 'g'));
begin
  insert into public.profiles (id, phone, username, first_name, last_name, name, initials)
  values (p_user_id, nullif(p_phone, ''), v_username || '_' || left(p_user_id::text, 6), v_first, coalesce(v_last, v_first), trim(p_name), public.fn_initials(trim(p_name)))
  on conflict (id) do nothing;
  insert into public.notification_prefs (user_id) values (p_user_id) on conflict (user_id) do nothing;
  insert into public.payment_methods (user_id, kind, removable, is_default)
  select p_user_id, 'cash', false, true
  where not exists (select 1 from public.payment_methods where user_id = p_user_id and kind = 'cash');
end;
$$;

create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_username text := coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
declare v_first text := coalesce(nullif(new.raw_user_meta_data ->> 'first_name', ''), v_username);
declare v_last text := coalesce(nullif(new.raw_user_meta_data ->> 'last_name', ''), v_first);
declare v_phone text := nullif(new.raw_user_meta_data ->> 'phone', '');
begin
  insert into public.profiles (id, phone, username, first_name, last_name, name, initials)
  values (new.id, v_phone, v_username, v_first, v_last, trim(v_first || ' ' || v_last), public.fn_initials(trim(v_first || ' ' || v_last)))
  on conflict (id) do nothing;
  insert into public.notification_prefs (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.payment_methods (user_id, kind, removable, is_default)
  select new.id, 'cash', false, true
  where not exists (select 1 from public.payment_methods where user_id = new.id and kind = 'cash');
  return new;
end;
$$;

create or replace function public.fn_ensure_profile()
returns void language plpgsql security definer set search_path = public as $$
declare u record;
begin
  select * into u from auth.users where id = auth.uid();
  if u.id is not null then
    insert into public.profiles (id, phone, username, first_name, last_name, name, initials)
    values (
      u.id,
      nullif(u.raw_user_meta_data ->> 'phone', ''),
      coalesce(nullif(u.raw_user_meta_data ->> 'username', ''), split_part(u.email, '@', 1)),
      coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), split_part(u.email, '@', 1)),
      coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), split_part(u.email, '@', 1)),
      trim(coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), split_part(u.email, '@', 1)) || ' ' || coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), split_part(u.email, '@', 1))),
      public.fn_initials(trim(coalesce(nullif(u.raw_user_meta_data ->> 'first_name', ''), split_part(u.email, '@', 1)) || ' ' || coalesce(nullif(u.raw_user_meta_data ->> 'last_name', ''), split_part(u.email, '@', 1))))
    ) on conflict (id) do nothing;
  end if;
end;
$$;

create or replace function public.fn_submit_identity(p_national_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_digits text := regexp_replace(coalesce(p_national_id, ''), '\D', '', 'g');
declare v_century int; v_dob date; v_hash text; v_age int;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if length(v_digits) <> 14 then return jsonb_build_object('status','rejected','reason','idNumberError'); end if;
  v_century := case left(v_digits, 1) when '2' then 1900 when '3' then 2000 else null end;
  if v_century is null then return jsonb_build_object('status','rejected','reason','idNumberError'); end if;
  begin v_dob := make_date(v_century + substr(v_digits,2,2)::int, substr(v_digits,4,2)::int, substr(v_digits,6,2)::int); exception when others then return jsonb_build_object('status','rejected','reason','idNumberError'); end;
  v_age := date_part('year', age(current_date, v_dob))::int;
  v_hash := encode(sha256(convert_to(v_digits || 'dokhan.id.v2.salted', 'utf8')), 'hex');
  if v_age < 18 then return jsonb_build_object('status','rejected','reason','ageBlocked'); end if;
  if exists (select 1 from public.id_verifications where national_id_hash = v_hash and user_id <> v_uid) then
    return jsonb_build_object('status','rejected','reason','idAlreadyUsed');
  end if;
  insert into public.id_verifications (user_id, national_id_hash, last_four, status, reviewed_at)
  values (v_uid, v_hash, right(v_digits,4), 'approved', now())
  on conflict (national_id_hash) do nothing;
  update public.profiles set age_verified = true, id_last_four = right(v_digits,4) where id = v_uid;
  return jsonb_build_object('status','approved','last_four',right(v_digits,4));
end;
$$;

create or replace function public.fn_set_role(p_phone text, p_role public.app_role)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_profile public.profiles;
begin
  if not public.fn_is_service() then
    raise exception 'NOT_AUTHORISED' using errcode = '42501';
  end if;

  select * into v_profile
  from public.profiles
  where lower(username) = lower(trim(p_phone))
     or (phone is not null and regexp_replace(phone, '\D', '', 'g') like '%' || regexp_replace(p_phone, '\D', '', 'g'))
  order by created_at
  limit 1;

  if not found then
    raise exception 'PROFILE_NOT_FOUND:%', p_phone using errcode = '22023';
  end if;

  update public.profiles set role = p_role where id = v_profile.id;
  insert into public.audit_log (actor, action, entity, entity_id, payload)
  values (auth.uid(), 'set_role', 'profiles', v_profile.id::text,
          jsonb_build_object('role', p_role, 'username', v_profile.username));
  return jsonb_build_object('id', v_profile.id, 'username', v_profile.username, 'role', p_role);
end;
$$;
