import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { visitorId, sessionId, path, device } = await request.json();
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (
      !uuid.test(visitorId) ||
      !uuid.test(sessionId) ||
      !["mobile", "tablet", "desktop"].includes(device)
    )
      return NextResponse.json({ error: "Invalid visit" }, { status: 400 });
    const admin = createAdminClient();
    const { error } = await admin
      .from("site_visits")
      .upsert(
        {
          visitor_id: visitorId,
          session_id: sessionId,
          path: String(path || "/").slice(0, 200),
          device,
        },
        { onConflict: "session_id,path", ignoreDuplicates: true },
      );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Visit not recorded" }, { status: 400 });
  }
}

export async function GET() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_visits")
    .select("visitor_id,path,device,visited_at")
    .gte("visited_at", new Date(Date.now() - 7 * 86400000).toISOString());
  const rows = data ?? [];
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayRows = rows.filter(
    (row) => row.visited_at.slice(0, 10) === todayKey,
  );
  const paths = Object.entries(
    rows.reduce<Record<string, number>>(
      (a, row) => ((a[row.path] = (a[row.path] ?? 0) + 1), a),
      {},
    ),
  ).sort((a, b) => b[1] - a[1]);
  return NextResponse.json({
    today: new Set(todayRows.map((r) => r.visitor_id)).size,
    sevenDays: new Set(rows.map((r) => r.visitor_id)).size,
    pageViews: rows.length,
    topPage: paths[0]?.[0] ?? "/",
    devices: rows.reduce<Record<string, number>>(
      (a, row) => ((a[row.device] = (a[row.device] ?? 0) + 1), a),
      {},
    ),
  });
}
