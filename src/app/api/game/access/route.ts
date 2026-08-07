import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StartPayload = {
  name?: unknown;
  phoneNumber?: unknown;
  token?: unknown;
};

function noStoreJson(body: object, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  return Response.json(body, { ...init, headers });
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return prefix + trimmed.replace(/\D/g, "");
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
  if (!isUuid(token)) {
    return noStoreJson({ status: "invalid" }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("game_entries")
      .select("is_used")
      .eq("token", token)
      .maybeSingle();

    if (error) throw error;
    if (!data) return noStoreJson({ status: "invalid" }, { status: 404 });
    return noStoreJson({ status: data.is_used ? "used" : "available" });
  } catch (error) {
    console.error("Unable to validate game token", error);
    return noStoreJson({ status: "error" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: StartPayload;
  try {
    payload = await request.json() as StartPayload;
  } catch {
    return noStoreJson({ error: "Invalid request." }, { status: 400 });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const phoneNumber = typeof payload.phoneNumber === "string" ? normalizePhone(payload.phoneNumber) : "";
  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  if (
    name.length < 1 || name.length > 60 ||
    phoneDigits.length < 7 || phoneDigits.length > 15 ||
    !isUuid(token)
  ) {
    return noStoreJson({ error: "Invalid player or token details." }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("game_entries")
      .update({
        name,
        phone_number: phoneNumber,
        is_used: true,
        used_at: new Date().toISOString(),
      })
      .eq("token", token)
      .eq("is_used", false)
      .is("used_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return noStoreJson(
        { error: "This QR code is invalid or has already been used." },
        { status: 409 },
      );
    }

    return noStoreJson({ started: true });
  } catch (error) {
    console.error("Unable to start game", error);
    return noStoreJson({ error: "The game could not be started." }, { status: 503 });
  }
}
