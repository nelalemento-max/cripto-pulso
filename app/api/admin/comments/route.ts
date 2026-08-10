import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

async function authorize(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: p } = await admin
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .single();
  return p?.role === "admin" && p?.status === "active" ? { admin, user } : null;
}
export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await auth.admin
    .from("community_comments")
    .select(
      "id,author_name,badge,asset,body,useful_count,score,status,created_at",
    )
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json({ error: "No se pudo cargar" }, { status: 500 });
  return NextResponse.json({ comments: data });
}
export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, action } = await request.json();
  if (!id || !["review", "hide", "restore"].includes(action))
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  const status =
    action === "review"
      ? "reviewed"
      : action === "hide"
        ? "hidden"
        : "published";
  const { error } = await auth.admin
    .from("community_comments")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: auth.user.id,
    })
    .eq("id", id);
  if (error)
    return NextResponse.json(
      { error: "No se pudo actualizar" },
      { status: 500 },
    );
  return NextResponse.json({ ok: true, status });
}
