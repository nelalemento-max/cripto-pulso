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
  const { data: profile } = await admin
    .from("profiles")
    .select("role,status")
    .eq("user_id", user.id)
    .single();
  return profile?.role === "admin" && profile?.status === "active"
    ? { admin, user }
    : null;
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { data, error } = await auth.admin
    .from("payment_requests")
    .select(
      "id,full_name,email,country,plan,payment_method,amount_label,payment_reference,receipt_path,status,created_at",
    )
    .order("created_at", { ascending: false });
  if (error)
    return NextResponse.json(
      { error: "No se pudieron cargar las solicitudes" },
      { status: 500 },
    );
  const requests = await Promise.all(
    (data ?? []).map(async (item) => {
      const { data: signed } = await auth.admin.storage
        .from("payment-receipts")
        .createSignedUrl(item.receipt_path, 600);
      return { ...item, receipt_url: signed?.signedUrl ?? null };
    }),
  );
  return NextResponse.json({ requests });
}

export async function PATCH(request: Request) {
  const auth = await authorize(request);
  if (!auth)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, action } = await request.json();
  if (!id || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const { data: payment } = await auth.admin
    .from("payment_requests")
    .select("email,status")
    .eq("id", id)
    .single();
  if (!payment || payment.status !== "pending")
    return NextResponse.json(
      { error: "La solicitud ya fue procesada" },
      { status: 409 },
    );
  if (action === "reject") {
    await auth.admin
      .from("payment_requests")
      .update({
        status: "rejected",
        reviewed_by: auth.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }
  const redirectTo = `${new URL(request.url).origin}/auth/activate`;
  const { error: inviteError } = await auth.admin.auth.admin.inviteUserByEmail(
    payment.email,
    { redirectTo },
  );
  if (inviteError && !inviteError.message.toLowerCase().includes("already"))
    return NextResponse.json(
      { error: "No se pudo enviar la invitación" },
      { status: 400 },
    );
  const { data: invited } = await auth.admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const student = invited.users.find(
    (user) => user.email?.toLowerCase() === payment.email.toLowerCase(),
  );
  if (student)
    await auth.admin
      .from("profiles")
      .update({ status: "active" })
      .eq("user_id", student.id);
  await auth.admin
    .from("payment_requests")
    .update({
      status: "invited",
      reviewed_by: auth.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  return NextResponse.json({ ok: true, status: "invited" });
}
