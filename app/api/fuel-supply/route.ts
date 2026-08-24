import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANH_BASE = "https://vsr11vpr08m22gb.anh.gob.bo:9443/WSMobile/v2";
// Identificador público incluido en la aplicación oficial. Solo se usa en el servidor.
const ANH_APP_ID = "9ADE86E5A083423EBE50C051F4DB9778";
const products = { gasoline: 1, diesel: 2 } as const;

type Product = keyof typeof products;
type AnhStation = {
  id: number;
  nombre: string;
  direccion?: string;
  zona?: string;
  departamento_id: number;
  lat?: number;
  lng?: number;
  saldo_estado?: string;
  despacho_en_curso?: boolean;
  fecha_hora_despacho?: string | null;
  con_venta?: boolean;
  fecha_ultima_venta?: string | null;
  updated_at?: string | null;
};

const normalizeStatus = (value?: string) => {
  if (value === "alto") return "high";
  if (value === "medio") return "medium";
  if (value === "bajo") return "low";
  return "unavailable";
};

const bucketNow = () => {
  const date = new Date();
  date.setUTCMinutes(date.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  return date.toISOString();
};

export async function GET(request: NextRequest) {
  const department = Number(request.nextUrl.searchParams.get("department") ?? "2");
  const product = (request.nextUrl.searchParams.get("product") ?? "gasoline") as Product;
  if (!Number.isInteger(department) || department < 1 || department > 9 || !(product in products)) {
    return NextResponse.json({ error: "Filtro inválido" }, { status: 400 });
  }

  try {
    const endpoint = `${ANH_BASE}/estaciones/${ANH_APP_ID}?departamento=${department}&producto=${products[product]}`;
    const upstream = await fetch(endpoint, {
      headers: { Accept: "application/json", "User-Agent": "CriptoPulso/1.0 public-information-dashboard" },
      signal: AbortSignal.timeout(25000),
      cache: "no-store",
    });
    if (!upstream.ok) throw new Error(`ANH ${upstream.status}`);
    const payload = await upstream.json();
    const sourceStations: AnhStation[] = Array.isArray(payload.oResultado) ? payload.oResultado : [];
    const observedAt = new Date().toISOString();
    const observedBucket = bucketNow();
    const stations = sourceStations.map((station) => ({
      id: station.id,
      name: station.nombre,
      address: station.direccion ?? "",
      zone: station.zona ?? "",
      departmentId: station.departamento_id,
      latitude: station.lat ?? null,
      longitude: station.lng ?? null,
      status: normalizeStatus(station.saldo_estado),
      rawStatus: station.saldo_estado ?? "no disponible",
      hasSales: Boolean(station.con_venta),
      lastSaleAt: station.fecha_ultima_venta,
      dispatchInProgress: Boolean(station.despacho_en_curso),
      dispatchAt: station.fecha_hora_despacho,
      sourceUpdatedAt: station.updated_at,
    }));

    let history: Array<{ observed_at: string; balance_status: string }> = [];
    try {
      const admin = createAdminClient();
      if (stations.length) {
        await admin.from("fuel_stations").upsert(stations.map((station) => ({
          station_id: station.id,
          name: station.name,
          address: station.address,
          zone: station.zone,
          department_id: station.departmentId,
          latitude: station.latitude,
          longitude: station.longitude,
          source_updated_at: station.sourceUpdatedAt,
          updated_at: observedAt,
        })), { onConflict: "station_id" });
        await admin.from("fuel_status_snapshots").upsert(stations.map((station) => ({
          station_id: station.id,
          product,
          balance_status: station.status,
          has_sales: station.hasSales,
          last_sale_at: station.lastSaleAt,
          dispatch_in_progress: station.dispatchInProgress,
          dispatch_at: station.dispatchAt,
          source_updated_at: station.sourceUpdatedAt,
          observed_at: observedAt,
          observed_bucket: observedBucket,
        })), { onConflict: "station_id,product,observed_bucket", ignoreDuplicates: true });
      }
      const stationIds = stations.map((station) => station.id);
      if (stationIds.length) {
        const { data } = await admin.from("fuel_status_snapshots")
          .select("observed_at,balance_status")
          .eq("product", product)
          .in("station_id", stationIds)
          .gte("observed_at", new Date(Date.now() - 7 * 86400000).toISOString())
          .order("observed_at", { ascending: true })
          .limit(5000);
        history = data ?? [];
      }
    } catch (storageError) {
      console.error("Fuel history storage unavailable", storageError);
    }

    const historyByHour = new Map<string, { high: number; medium: number; low: number; unavailable: number }>();
    history.forEach((row) => {
      const key = new Date(row.observed_at).toISOString().slice(0, 13) + ":00:00.000Z";
      const point = historyByHour.get(key) ?? { high: 0, medium: 0, low: 0, unavailable: 0 };
      point[row.balance_status as keyof typeof point] += 1;
      historyByHour.set(key, point);
    });
    const trend = Array.from(historyByHour, ([time, counts]) => {
      const total = counts.high + counts.medium + counts.low + counts.unavailable;
      return { time, ...counts, total, index: total ? Math.round((counts.high * 100 + counts.medium * 60 + counts.low * 20) / total) : 0 };
    }).slice(-48);

    return NextResponse.json({
      stations,
      trend,
      sourceTime: payload.server_time ?? observedAt,
      observedAt,
      source: "ANH Abastecimiento",
      methodology: "Los estados se reciben de ANH. El índice usa alto=100, medio=60, bajo=20 y no disponible=0.",
    }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } });
  } catch (error) {
    console.error("ANH supply fetch failed", error);
    return NextResponse.json({ error: "La fuente ANH no respondió. Intenta nuevamente en unos minutos." }, { status: 502 });
  }
}
