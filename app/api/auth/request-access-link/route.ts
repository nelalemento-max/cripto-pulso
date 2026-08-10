import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase-admin";

const genericMessage =
  "Si el correo tiene un pago aprobado, recibirás un enlace nuevo. Revisa también spam o correo no deseado.";

export async function POST(request: Request) {
  const { email: rawEmail } = await request.json().catch(() => ({ email: "" }));
  const email = String(rawEmail ?? "").trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email))
    return NextResponse.json({ message: genericMessage });

  const admin = createAdminClient();
  const { data: payment } = await admin
    .from("payment_requests")
    .select("id,status,resend_requested_at")
    .eq("email", email)
    .in("status", ["invited", "approved"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) return NextResponse.json({ message: genericMessage });
  const lastRequest = payment.resend_requested_at
    ? new Date(payment.resend_requested_at).getTime()
    : 0;
  if (Date.now() - lastRequest < 5 * 60 * 1000)
    return NextResponse.json({
      message: "Ya enviamos un enlace. Espera 5 minutos antes de pedir otro.",
    });

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = listed.data.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  const redirectTo = `${new URL(request.url).origin}/auth/activate`;
  let sendError: { message: string; code?: string } | null = null;

  if (user?.email_confirmed_at) {
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url || !publicKey)
      return NextResponse.json({ message: genericMessage });
    const publicClient = createClient(url, publicKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await publicClient.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    sendError = error;
  } else {
    if (user) {
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) sendError = error;
      user = undefined;
    }
    if (!sendError) {
      const { error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      });
      sendError = error;
    }
  }

  if (!sendError) {
    const now = new Date().toISOString();
    await admin
      .from("payment_requests")
      .update({ status: "invited", invite_sent_at: now, resend_requested_at: now })
      .eq("id", payment.id);
  }
  return NextResponse.json({ message: genericMessage });
}
