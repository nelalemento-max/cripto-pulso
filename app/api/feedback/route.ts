import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function isAdmin(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = createAdminClient();
  const {
    data: { user },
  } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "admin" && profile.status === "active"
    ? admin
    : null;
}

export async function POST(request: Request) {
  try {
    const { visitorId, sessionId, answer, section, device } =
      await request.json();
    const cleanAnswer = String(answer ?? "").trim().slice(0, 500);
    if (
      !uuid.test(visitorId) ||
      !uuid.test(sessionId) ||
      cleanAnswer.length < 3 ||
      !["mobile", "tablet", "desktop"].includes(device)
    )
      return NextResponse.json({ error: "Respuesta inválida." }, { status: 400 });
    const admin = createAdminClient();
    const { error } = await admin.from("visitor_feedback").upsert(
      {
        visitor_id: visitorId,
        session_id: sessionId,
        answer: cleanAnswer,
        section: String(section || "market").slice(0, 60),
        device,
      },
      { onConflict: "visitor_id", ignoreDuplicates: true },
    );
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "No pudimos guardar la respuesta." },
      { status: 400 },
    );
  }
}

export async function GET(request: Request) {
  const admin = await isAdmin(request);
  if (!admin)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await admin
    .from("visitor_feedback")
    .select("id,answer,section,device,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error)
    return NextResponse.json(
      { error: "No se pudieron cargar los intereses." },
      { status: 500 },
    );
  return NextResponse.json({ responses: data ?? [] });
}
