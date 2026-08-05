import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEADERBOARD_COLUMNS = "id,display_name,score,survival_ms,created_at,festival_day" as const;

type ScorePayload = {
  displayName?: unknown;
  phoneNumber?: unknown;
  score?: unknown;
  survivalMs?: unknown;
};

function festivalDay() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Beirut",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function normalizePhone(value: string) {
  const trimmed = value.trim();
  const prefix = trimmed.startsWith("+") ? "+" : "";
  return prefix + trimmed.replace(/\D/g, "");
}

async function getLeaderboard() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_scores")
    .select(LEADERBOARD_COLUMNS)
    .eq("festival_day", festivalDay())
    .order("score", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw error;
  return data;
}

export async function GET() {
  try {
    return Response.json({ entries: await getLeaderboard() });
  } catch (error) {
    console.error("Unable to load leaderboard", error);
    return Response.json({ error: "Leaderboard is not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let payload: ScorePayload;
  try {
    payload = await request.json() as ScorePayload;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const displayName = typeof payload.displayName === "string" ? payload.displayName.trim() : "";
  const phoneNumber = typeof payload.phoneNumber === "string" ? normalizePhone(payload.phoneNumber) : "";
  const score = typeof payload.score === "number" ? Math.floor(payload.score) : -1;
  const survivalMs = typeof payload.survivalMs === "number" ? Math.floor(payload.survivalMs) : -1;
  const phoneDigits = phoneNumber.replace(/\D/g, "");

  if (
    displayName.length < 1 || displayName.length > 60 ||
    phoneDigits.length < 7 || phoneDigits.length > 15 ||
    score < 0 || score > 10_000_000 ||
    survivalMs < 0 || survivalMs > 86_400_000
  ) {
    return Response.json({ error: "Invalid player or score details." }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data: submitted, error } = await supabase
      .from("game_scores")
      .insert({
        display_name: displayName,
        phone_number: phoneNumber,
        score,
        survival_ms: survivalMs,
      })
      .select(LEADERBOARD_COLUMNS)
      .single();

    if (error) throw error;
    return Response.json({ entries: await getLeaderboard(), submittedId: submitted.id }, { status: 201 });
  } catch (error) {
    console.error("Unable to submit score", error);
    return Response.json({ error: "Score could not be saved." }, { status: 503 });
  }
}
