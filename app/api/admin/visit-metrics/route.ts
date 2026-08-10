import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data: profile } = await admin
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .single();
  if (profile?.role !== "admin" || profile.status !== "active")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await admin
    .from("site_visits")
    .select("path")
    .gte("visited_at", new Date(Date.now() - 7 * 86400000).toISOString());
  if (error)
    return NextResponse.json(
      { error: "No se pudo cargar el recorrido." },
      { status: 500 },
    );
  const pages = (data ?? []).reduce<Record<string, number>>(
    (totals, row) => {
      totals[row.path] = (totals[row.path] ?? 0) + 1;
      return totals;
    },
    {},
  );
  return NextResponse.json({ pages });
}
