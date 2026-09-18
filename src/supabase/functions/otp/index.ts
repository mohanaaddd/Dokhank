import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });

const prettyPhone = (digits: string) => {
  const parts = [digits.slice(0, 2), digits.slice(2, 6), digits.slice(6, 10)].filter(Boolean);
  return `+20 ${parts.join(" ")}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method" });

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return json(500, { error: "misconfigured" });

  let payload: { phone?: string; code?: string };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalidCode" });
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: consumed, error: consumeError } = await admin.rpc("fn_consume_phone_otp", {
    p_phone: payload.phone ?? "",
    p_code: payload.code ?? ""
  });

  if (consumeError) return json(400, { error: "invalidCode" });

  const result = (consumed ?? {}) as {
    ok?: boolean;
    reason?: string;
    digits?: string;
    name?: string | null;
    is_new?: boolean;
  };

  if (!result.ok || !result.digits) {
    return json(401, { error: result.reason ?? "invalidCode" });
  }

  const digits = result.digits;
  const email = `eg${digits}@dokhan.dev`;
  const password = `${crypto.randomUUID()}Aa1!`;
  const displayName = (result.name && result.name.trim()) || "Dokhan";
  const metadata = {
    phone: prettyPhone(digits),
    name: displayName
  };

  const { data: existing } = await admin
    .from("profiles")
    .select("id,name")
    .filter("phone", "eq", prettyPhone(digits))
    .maybeSingle();

  let userId = existing?.id as string | undefined;

  if (!userId) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone: `+20${digits}`,
      phone_confirm: true,
      user_metadata: metadata
    });
    if (created.error || !created.data.user) {
      const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = listed.data.users.find((user) => user.email === email);
      if (!found) return json(500, { error: "requestFailed" });
      userId = found.id;
      const updated = await admin.auth.admin.updateUserById(userId, {
        password,
        phone: `+20${digits}`,
        user_metadata: metadata
      });
      if (updated.error) return json(500, { error: "requestFailed" });
    } else {
      userId = created.data.user.id;
    }
  } else {
    const updated = await admin.auth.admin.updateUserById(userId, {
      password,
      phone: `+20${digits}`,
      email_confirm: true
    });
    if (updated.error) return json(500, { error: "requestFailed" });
  }

  const signIn = await admin.auth.signInWithPassword({ email, password });
  if (signIn.error || !signIn.data.session) {
    return json(500, { error: "requestFailed" });
  }

  if (result.is_new && result.name) {
    await admin
      .from("profiles")
      .update({ name: displayName, phone: prettyPhone(digits) })
      .eq("id", userId);
  }

  const session = signIn.data.session;
  return json(200, {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in
  });
});
