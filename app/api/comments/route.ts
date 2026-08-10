import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("community_comments")
    .select(
      "id,author_name,badge,asset,body,useful_count,score,status,created_at",
    )
    .neq("status", "hidden")
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "No se pudieron cargar los comentarios" },
      { status: 500 },
    );
  return NextResponse.json({ comments: data });
}

export async function POST(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token)
    return NextResponse.json(
      { error: "Inicia sesión para comentar." },
      { status: 401 },
    );
  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user)
    return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });
  const { asset, body } = await request.json();
  const text = String(body ?? "").trim();
  if (text.length < 10 || text.length > 1200)
    return NextResponse.json(
      { error: "El comentario debe tener entre 10 y 1200 caracteres." },
      { status: 400 },
    );
  const name = String(user.email ?? "Usuario")
    .split("@")[0]
    .slice(0, 80);
  const { error } = await admin
    .from("community_comments")
    .insert({
      user_id: user.id,
      author_name: name,
      asset: String(asset ?? "BTC").slice(0, 20),
      body: text,
      status: "published",
    });
  if (error)
    return NextResponse.json(
      { error: "No se pudo publicar." },
      { status: 500 },
    );
  return NextResponse.json({ ok: true });
}
