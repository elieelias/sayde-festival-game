import { createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const LEADERBOARD_COLUMNS = "id,name,score" as const;

type ScorePayload = {
  score?: unknown;
  token?: unknown;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function getLeaderboard() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("game_entries")
    .select(LEADERBOARD_COLUMNS)
    .not("name", "is", null)
    .not("score", "is", null)
    .order("score", { ascending: false })
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

  const token = typeof payload.token === "string" ? payload.token.trim() : "";
  const score = typeof payload.score === "number" ? Math.floor(payload.score) : -1;

  if (
    !isUuid(token) ||
    score < 0 || score > 10_000_000
  ) {
    return Response.json({ error: "Invalid token or score details." }, { status: 400 });
  }

  try {
    const supabase = createServerClient();
    const { data: submitted, error } = await supabase
      .from("game_entries")
      .update({ score })
      .eq("token", token)
      .eq("is_used", true)
      .is("score", null)
      .select(LEADERBOARD_COLUMNS)
      .maybeSingle();

    if (error) throw error;
    if (!submitted) {
      return Response.json({ error: "This game token is invalid or already submitted." }, { status: 409 });
    }

    const { count: higherScores, error: rankError } = await supabase
      .from("game_entries")
      .select("id", { count: "exact", head: true })
      .not("score", "is", null)
      .gt("score", submitted.score ?? 0);

    if (rankError) throw rankError;
    return Response.json({
      entries: await getLeaderboard(),
      submittedId: submitted.id,
      submittedRank: (higherScores ?? 0) + 1,
    }, { status: 200 });
  } catch (error) {
    console.error("Unable to submit score", error);
    return Response.json({ error: "Score could not be saved." }, { status: 503 });
  }
}
