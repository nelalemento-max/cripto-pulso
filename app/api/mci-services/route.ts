import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedOrigins = new Set([
  "https://mci-industria.web.app",
  "https://mci-industria.firebaseapp.com",
  "https://localhost",
  "http://localhost:5173",
]);

const regionalFuel = [
  { country: "Brasil", gasoline: 1.17, diesel: 1.29, lpg: 0.78 },
  { country: "Paraguay", gasoline: 1.10, diesel: 1.34, lpg: 0.72 },
  { country: "Argentina", gasoline: 1.36, diesel: 1.51, lpg: 0.52 },
  { country: "Perú", gasoline: 1.20, diesel: 1.78, lpg: 0.63 },
  { country: "Chile", gasoline: 1.59, diesel: 1.31, lpg: 0.73 },
];

function corsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://mci-industria.web.app",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

export function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

export async function GET(request: NextRequest) {
  let p2p = { buy: 11.14, sell: 11.18, updatedAt: null as string | null, status: "fallback" };
  try {
    const response = await fetch("https://bo.dolarapi.com/v1/dolares/binance", {
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: 120 },
    });
    if (response.ok) {
      const value = await response.json();
      const buy = Number(value.compra);
      const sell = Number(value.venta);
      if (buy > 5 && buy < 25 && sell > 5 && sell < 25) {
        p2p = { buy, sell, updatedAt: value.fechaActualizacion ?? new Date().toISOString(), status: "live" };
      }
    }
  } catch {
    // Se mantiene la última referencia de respaldo identificada como tal.
  }

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    source: "Cripto Pulso",
    dollar: {
      official: { buy: 11.86, sell: 11.86, label: "Referencia institucional mostrada", status: "configured" },
      p2p,
    },
    boliviaFuel: [
      { name: "Gasolina especial", value: 6.96, unit: "Bs/L" },
      { name: "Diésel oil", value: 9.80, unit: "Bs/L" },
      { name: "Gasolina premium", value: 11.00, unit: "Bs/L" },
      { name: "GLP domiciliario", value: 22.50, unit: "Bs/garrafa" },
    ],
    regionalFuel,
    notices: {
      official: "El valor institucional está configurado en Cripto Pulso y debe verificarse cuando cambie la referencia oficial.",
      p2p: "Referencia digital informativa; no constituye una oferta de cambio.",
      regionalFuel: "Referencias en USD por litro, sujetas a ciudad, calidad, impuestos y fecha.",
    },
  }, {
    headers: { ...corsHeaders(request), "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300" },
  });
}
