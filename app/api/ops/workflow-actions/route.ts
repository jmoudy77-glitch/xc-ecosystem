import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function isKey(v: unknown): v is string {
  return typeof v === "string" && /^[a-z0-9][a-z0-9:_\-\.]{1,127}$/i.test(v);
}

export async function POST(req: NextRequest) {
  const { supabase } = await supabaseServer(req);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const key = body?.key;
  const version = body?.version;
  const description = body?.description;
  const schema = body?.schema;
  const is_enabled = body?.is_enabled;

  if (!isKey(key)) {
    return NextResponse.json({ error: "invalid_key" }, { status: 400 });
  }
  if (version !== undefined && (typeof version !== "string" || !version.trim())) {
    return NextResponse.json({ error: "invalid_version" }, { status: 400 });
  }
  if (description !== undefined && description !== null && typeof description !== "string") {
    return NextResponse.json({ error: "invalid_description" }, { status: 400 });
  }
  if (schema !== undefined && (schema === null || typeof schema !== "object" || Array.isArray(schema))) {
    return NextResponse.json({ error: "invalid_schema" }, { status: 400 });
  }
  if (is_enabled !== undefined && typeof is_enabled !== "boolean") {
    return NextResponse.json({ error: "invalid_is_enabled" }, { status: 400 });
  }

  const payload = {
    key: key.toLowerCase(),
    version: typeof version === "string" ? version.trim() : "v1",
    description: typeof description === "string" ? description : null,
    schema: schema ?? {},
    is_enabled: typeof is_enabled === "boolean" ? is_enabled : true,
  };

  const { data, error } = await supabase
    .from("operational_workflow_actions")
    .upsert(payload, { onConflict: "key" })
    .select("key,version,is_enabled")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ key: data.key, version: data.version, is_enabled: data.is_enabled }, { status: 201 });
}
