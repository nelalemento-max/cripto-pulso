import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const plans: Record<string, { method: string; amount: string }> = {
  basic_bo: { method: "qr", amount: "USD 1 / equivalente BOB" },
  crypto_10: { method: "airtm", amount: "10 USDT" },
  crypto_20: { method: "airtm", amount: "20 USDT" },
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    if (form.get("website")) return NextResponse.json({ ok: true });
    const fullName = String(form.get("fullName") ?? "").trim();
    const email = String(form.get("email") ?? "")
      .trim()
      .toLowerCase();
    const country = String(form.get("country") ?? "").trim();
    const plan = String(form.get("plan") ?? "");
    const reference = String(form.get("reference") ?? "")
      .trim()
      .slice(0, 120);
    const paidAmount = String(form.get("paidAmount") ?? "")
      .trim()
      .slice(0, 40);
    const receipt = form.get("receipt");
    if (
      fullName.length < 2 ||
      country.length < 2 ||
      paidAmount.length < 1 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      !plans[plan]
    ) {
      return NextResponse.json(
        { error: "Datos incompletos o inválidos." },
        { status: 400 },
      );
    }
    if (
      !(receipt instanceof File) ||
      receipt.size === 0 ||
      receipt.size > 5 * 1024 * 1024
    ) {
      return NextResponse.json(
        { error: "Adjunta un comprobante de hasta 5 MB." },
        { status: 400 },
      );
    }
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(receipt.type))
      return NextResponse.json(
        { error: "Formato de comprobante no permitido." },
        { status: 400 },
      );
    const admin = createAdminClient();
    const extension =
      receipt.type === "application/pdf"
        ? "pdf"
        : receipt.type.split("/")[1].replace("jpeg", "jpg");
    const path = `${crypto.randomUUID()}/${Date.now()}.${extension}`;
    const bytes = new Uint8Array(await receipt.arrayBuffer());
    const { error: uploadError } = await admin.storage
      .from("payment-receipts")
      .upload(path, bytes, { contentType: receipt.type, upsert: false });
    if (uploadError) throw uploadError;
    const config = plans[plan];
    const { error } = await admin.from("payment_requests").insert({
      full_name: fullName,
      email,
      country,
      plan,
      payment_method: config.method,
      amount_label: config.amount,
      paid_amount: paidAmount,
      payment_reference: reference || null,
      receipt_path: path,
    });
    if (error) {
      await admin.storage.from("payment-receipts").remove([path]);
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("payment request failed", error);
    return NextResponse.json(
      { error: "No se pudo registrar la solicitud." },
      { status: 500 },
    );
  }
}
