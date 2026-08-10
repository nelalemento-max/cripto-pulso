import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

const products = ["Carne de res", "Pollo", "Huevos", "Arroz", "Aceite", "Azúcar", "Harina", "Fideo", "Papa", "Tomate", "Cebolla", "Leche"];
const departments = ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Tarija", "Oruro", "Potosí", "Beni", "Pando"];
const units = ["kg", "litro", "docena", "arroba", "quintal", "unidad"];

async function currentUser(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const admin = createAdminClient();
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from("profiles").select("role,status").eq("user_id", user.id).single();
  return { admin, user, profile };
}

export async function GET(request: Request) {
  const admin = createAdminClient();
  const wantsAdmin = new URL(request.url).searchParams.get("admin") === "1";
  if (wantsAdmin) {
    const auth = await currentUser(request);
    if (!auth || auth.profile?.role !== "admin" || auth.profile?.status !== "active")
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    const { data, error } = await admin.from("basket_price_reports").select("*").order("created_at", { ascending: false }).limit(150);
    return error ? NextResponse.json({ error: "No se pudieron cargar los reportes" }, { status: 500 }) : NextResponse.json({ reports: data ?? [] });
  }
  const { data, error } = await admin.from("basket_price_reports")
    .select("id,product,price,unit,department,city,market,purchased_on,created_at")
    .eq("status", "approved").order("purchased_on", { ascending: false }).limit(300);
  return error ? NextResponse.json({ reports: [] }) : NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await currentUser(request);
  if (!auth?.user || auth.profile?.status !== "active")
    return NextResponse.json({ error: "Necesitas una cuenta pagada activa" }, { status: 403 });
  const body = await request.json();
  const price = Number(body.price);
  if (!products.includes(body.product) || !departments.includes(body.department) || !units.includes(body.unit) || !Number.isFinite(price) || price <= 0 || price > 100000)
    return NextResponse.json({ error: "Revisa producto, región, unidad y precio" }, { status: 400 });
  if (String(body.city ?? "").trim().length < 2 || String(body.market ?? "").trim().length < 2)
    return NextResponse.json({ error: "Indica ciudad y mercado o tienda" }, { status: 400 });
  const { error } = await auth.admin.from("basket_price_reports").insert({
    user_id: auth.user.id, product: body.product, price, unit: body.unit,
    department: body.department, city: String(body.city).trim().slice(0, 80),
    market: String(body.market).trim().slice(0, 120),
    purchased_on: body.purchasedOn || new Date().toISOString().slice(0, 10), status: "pending",
  });
  return error ? NextResponse.json({ error: "No se pudo guardar el reporte" }, { status: 500 }) : NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const auth = await currentUser(request);
  if (!auth || auth.profile?.role !== "admin" || auth.profile?.status !== "active")
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id, action } = await request.json();
  if (!id || !["approve", "reject"].includes(action))
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  const { error } = await auth.admin.from("basket_price_reports").update({
    status: action === "approve" ? "approved" : "rejected",
    reviewed_by: auth.user.id, reviewed_at: new Date().toISOString(),
  }).eq("id", id).eq("status", "pending");
  return error ? NextResponse.json({ error: "No se pudo revisar el reporte" }, { status: 500 }) : NextResponse.json({ ok: true });
}
