-- Phone lookup + hashed OTP challenges. Sessions are minted by the `otp`
-- Edge Function (service role); these RPCs never return the code.

create table if not exists public.otp_challenges (
  phone_digits  text primary key,
  code_hash     text not null,
  pending_name  text,
  is_new        boolean not null default true,
  attempts      integer not null default 0,
  sent_at       timestamptz not null default now(),
  expires_at    timestamptz not null
);

create table if not exists public.phone_lookup_events (
  id            bigserial primary key,
  phone_digits  text not null,
  created_at    timestamptz not null default now()
);
create index if not exists phone_lookup_events_phone_created_idx
  on public.phone_lookup_events (phone_digits, created_at desc);

alter table public.otp_challenges enable row level security;
alter table public.phone_lookup_events enable row level security;
-- No policies: service role + security definer only.

create or replace function public.fn_eg_national_digits(p_phone text)
returns text
language plpgsql
immutable
as $$
declare
  v text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  if v like '20%' then
    v := substr(v, 3);
  elsif v like '0%' then
    v := substr(v, 2);
  end if;
  if v ~ '^1[0125][0-9]{8}$' then
    return v;
  end if;
  return null;
end;
$$;

create or replace function public.fn_otp_hash(p_digits text, p_code text)
returns text
language sql
immutable
as $$
  select encode(sha256(convert_to(p_digits || ':' || p_code || ':dokhan.otp.v1', 'utf8')), 'hex');
$$;

create or replace function public.fn_phone_registered(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.fn_eg_national_digits(p_phone);
  v_count  integer;
  v_exists boolean;
begin
  if v_digits is null then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;

  select count(*) into v_count
  from public.phone_lookup_events
  where phone_digits = v_digits
    and created_at > now() - interval '10 minutes';

  if v_count >= 8 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  insert into public.phone_lookup_events (phone_digits) values (v_digits);

  select exists (
    select 1
    from public.profiles p
    where right(regexp_replace(p.phone, '\D', '', 'g'), 10) = v_digits
  ) into v_exists;

  return jsonb_build_object('exists', v_exists);
end;
$$;

create or replace function public.fn_request_phone_otp(p_phone text, p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.fn_eg_national_digits(p_phone);
  v_exists boolean;
  v_name   text := nullif(btrim(coalesce(p_name, '')), '');
  v_code   text;
  v_prev   public.otp_challenges;
begin
  if v_digits is null then
    raise exception 'INVALID_PHONE' using errcode = '22023';
  end if;

  select exists (
    select 1
    from public.profiles p
    where right(regexp_replace(p.phone, '\D', '', 'g'), 10) = v_digits
  ) into v_exists;

  if not v_exists then
    if v_name is null or char_length(v_name) < 3 then
      raise exception 'NAME_REQUIRED' using errcode = '22023';
    end if;
  else
    v_name := null;
  end if;

  select * into v_prev from public.otp_challenges where phone_digits = v_digits;
  if found and v_prev.sent_at > now() - interval '60 seconds' then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;

  -- Staff test line: no SMS provider required.
  if v_digits = '1018013090' then
    v_code := '4938';
  else
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
  end if;

  insert into public.otp_challenges (phone_digits, code_hash, pending_name, is_new, attempts, sent_at, expires_at)
  values (
    v_digits,
    public.fn_otp_hash(v_digits, v_code),
    v_name,
    not v_exists,
    0,
    now(),
    now() + interval '5 minutes'
  )
  on conflict (phone_digits) do update
    set code_hash    = excluded.code_hash,
        pending_name = excluded.pending_name,
        is_new       = excluded.is_new,
        attempts     = 0,
        sent_at      = excluded.sent_at,
        expires_at   = excluded.expires_at;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.fn_consume_phone_otp(p_phone text, p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_digits text := public.fn_eg_national_digits(p_phone);
  v_code   text := regexp_replace(coalesce(p_code, ''), '\D', '', 'g');
  v_row    public.otp_challenges;
begin
  if v_digits is null or length(v_code) <> 4 then
    return jsonb_build_object('ok', false, 'reason', 'invalidCode');
  end if;

  select * into v_row from public.otp_challenges where phone_digits = v_digits;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalidCode');
  end if;

  if v_row.expires_at < now() then
    delete from public.otp_challenges where phone_digits = v_digits;
    return jsonb_build_object('ok', false, 'reason', 'otpExpired');
  end if;

  if v_row.attempts >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'otpLocked');
  end if;

  update public.otp_challenges
     set attempts = attempts + 1
   where phone_digits = v_digits;

  if v_row.code_hash <> public.fn_otp_hash(v_digits, v_code) then
    return jsonb_build_object('ok', false, 'reason', 'invalidCode');
  end if;

  delete from public.otp_challenges where phone_digits = v_digits;

  return jsonb_build_object(
    'ok', true,
    'digits', v_digits,
    'name', v_row.pending_name,
    'is_new', v_row.is_new
  );
end;
$$;

-- Prefer first + last name from Auth metadata when present.
create or replace function public.fn_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_name  text;
begin
  v_phone := coalesce(
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    case
      when new.phone is not null and new.phone <> ''
      then '+' || regexp_replace(new.phone, '\D', '', 'g')
    end,
    new.email,
    'unknown-' || left(new.id::text, 8)
  );
  v_name := nullif(btrim(concat_ws(' ',
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', '')
  )), '');
  v_name := coalesce(
    v_name,
    nullif(new.raw_user_meta_data ->> 'name', ''),
    'Dokhan'
  );

  perform public.fn_bootstrap_user(new.id, v_phone, v_name);
  return new;
end;
$$;

revoke all on public.otp_challenges from public, anon, authenticated;
revoke all on public.phone_lookup_events from public, anon, authenticated;

revoke execute on function public.fn_eg_national_digits(text) from public;
revoke execute on function public.fn_otp_hash(text, text) from public;
revoke execute on function public.fn_phone_registered(text) from public;
revoke execute on function public.fn_request_phone_otp(text, text) from public;
revoke execute on function public.fn_consume_phone_otp(text, text) from public;

grant execute on function public.fn_phone_registered(text) to anon, authenticated;
grant execute on function public.fn_request_phone_otp(text, text) to anon, authenticated;
grant execute on function public.fn_consume_phone_otp(text, text) to service_role;
