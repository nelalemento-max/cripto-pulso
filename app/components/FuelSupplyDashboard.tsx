"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FuelStatus = "high" | "medium" | "low" | "unavailable";
type Station = {
  id: number; name: string; address: string; status: FuelStatus; hasSales: boolean;
  latitude?: number | null; longitude?: number | null;
  lastSaleAt?: string | null; dispatchInProgress: boolean; dispatchAt?: string | null; sourceUpdatedAt?: string | null;
};
type Trend = { time: string; high: number; medium: number; low: number; unavailable: number; total: number; index: number };
type FuelResponse = { stations: Station[]; trend: Trend[]; sourceTime: string; observedAt: string; source: string; methodology: string; error?: string };

const departments = [
  [1, "Chuquisaca"], [2, "La Paz"], [3, "Cochabamba"], [4, "Oruro"], [5, "Potosí"],
  [6, "Tarija"], [7, "Santa Cruz"], [8, "Beni"], [9, "Pando"],
] as const;
const statusInfo: Record<FuelStatus, { label: string; level: number; range: string; tone: string }> = {
  high: { label: "Saldo completo", level: 88, range: "Más de 15.000 L", tone: "green" },
  medium: { label: "Saldo aceptable", level: 58, range: "Entre 5.000 y 15.000 L", tone: "amber" },
  low: { label: "Saldo bajo", level: 18, range: "Menos de 5.000 L", tone: "red" },
  unavailable: { label: "Sin saldo reportado", level: 0, range: "Sin disponibilidad informada", tone: "gray" },
};
const productInfo = {
  gasoline: { label: "Gasolina", short: "Gasolina" },
  diesel: { label: "Diésel", short: "Diésel" },
  premium: { label: "Gasolina Premium", short: "Premium" },
  uls: { label: "Diésel Oil Plus (ULS)", short: "Diésel Plus" },
} as const;
type Product = keyof typeof productInfo;
type TankOrder = "source" | "highest" | "lowest";

function timeAgo(value?: string | null) {
  if (!value) return "sin hora reportada";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 2) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} días`;
}

function LiquidTank({ status, compact = false }: { status: FuelStatus; compact?: boolean }) {
  const info = statusInfo[status];
  return <div className={`liquid-tank ${info.tone} ${compact ? "compact" : ""}`} aria-label={`${info.label}: nivel visual estimado ${info.level}%`}>
    <div className="tank-scale"><i></i><i></i><i></i><i></i></div>
    <div className="tank-liquid" style={{ height: `${info.level}%` }}><span></span></div>
    <div className="tank-reading"><b>{info.level}%</b><small>estimación visual</small></div>
  </div>;
}

export default function FuelSupplyDashboard() {
  const [department, setDepartment] = useState(2);
  const [product, setProduct] = useState<Product>("gasoline");
  const [statusFilter, setStatusFilter] = useState<"all" | FuelStatus>("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<FuelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [tankOrder, setTankOrder] = useState<TankOrder>("source");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/fuel-supply?department=${department}&product=${product}`, { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "No se pudo consultar ANH");
      setData(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo consultar ANH"); }
    finally { setLoading(false); }
  }, [department, product]);

  useEffect(() => { load(); const timer = window.setInterval(load, 300000); return () => window.clearInterval(timer); }, [load]);

  const counts = useMemo(() => {
    const base = { high: 0, medium: 0, low: 0, unavailable: 0 };
    data?.stations.forEach((station) => base[station.status]++);
    return base;
  }, [data]);
  const total = data?.stations.length ?? 0;
  const supplyIndex = total ? Math.round((counts.high * 100 + counts.medium * 60 + counts.low * 20) / total) : 0;
  const selling = data?.stations.filter((station) => station.hasSales).length ?? 0;
  const dispatches = data?.stations.filter((station) => station.dispatchInProgress).length ?? 0;
  const filtered = useMemo(() => {
    const level = (station: Station) => statusInfo[station.status].level;
    const results = (data?.stations ?? []).filter((station) =>
      (statusFilter === "all" || station.status === statusFilter) &&
      (!search || `${station.name} ${station.address}`.toLowerCase().includes(search.toLowerCase())),
    );
    if (tankOrder === "highest") return results.toSorted((a, b) => level(b) - level(a));
    if (tankOrder === "lowest") return results.toSorted((a, b) => level(a) - level(b));
    return results;
  }, [data, search, statusFilter, tankOrder]);
  const shown = showAll ? filtered : filtered.slice(0, 12);
  const departmentName = departments.find(([id]) => id === department)?.[1] ?? "Bolivia";
  const trend = data?.trend ?? [];
  const trendValues = trend.map((point) => point.index);
  const rawTrendMin = trendValues.length ? Math.min(...trendValues) : 0;
  const rawTrendMax = trendValues.length ? Math.max(...trendValues) : 100;
  const trendPadding = Math.max(3, Math.ceil((rawTrendMax - rawTrendMin) * .2));
  const trendMin = Math.max(0, rawTrendMin - trendPadding);
  const trendMax = Math.min(100, rawTrendMax + trendPadding);
  const trendRange = Math.max(1, trendMax - trendMin);
  const chartY = (value: number) => 88 - ((value - trendMin) / trendRange) * 70;
  const chartPoints = trend.map((point, index, values) => `${values.length === 1 ? 50 : 8 + index * (86 / (values.length - 1))},${chartY(point.index)}`).join(" ");
  const trendChange = trend.length > 1 ? trend.at(-1)!.index - trend[0].index : 0;

  return <section className="page fuel-page">
    <header className="fuel-hero">
      <div><span className="live-dot">● DATOS EN VIVO · FUENTE ANH</span><h1>Abastecimiento <i>Bolivia</i></h1><p>Transformamos estados operativos públicos en información visual para encontrar combustible y comprender el abastecimiento.</p></div>
      <div className="fuel-source"><small>ÚLTIMA CONSULTA</small><b>{data ? new Date(data.sourceTime).toLocaleTimeString("es-BO", { hour: "2-digit", minute: "2-digit" }) : "—"}</b><span>Actualización automática cada 5 minutos</span></div>
    </header>

    <article className="fuel-filters panel">
      <label>DEPARTAMENTO<select value={department} onChange={(event) => setDepartment(Number(event.target.value))}>{departments.map(([id, name]) => <option value={id} key={id}>{name}</option>)}</select></label>
      <label>PRODUCTO<select value={product} onChange={(event) => setProduct(event.target.value as Product)}>{Object.entries(productInfo).map(([id, info]) => <option key={id} value={id}>{info.label}</option>)}</select></label>
      <label>BUSCAR ESTACIÓN<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, zona o dirección" /></label>
      <button onClick={load} disabled={loading}>{loading ? "Consultando ANH…" : "Actualizar ahora"}</button>
    </article>

    {error && <div className="fuel-error">{error}</div>}
    <div className="fuel-overview">
      <article className="panel main-tank-card">
        <div><span className="panel-label">ÍNDICE CRIPTOPULSO</span><h2>{departmentName}</h2><p>{productInfo[product].label} · {total} estaciones informadas</p><div className="index-number"><b>{supplyIndex}</b><span>/100</span></div></div>
        <LiquidTank status={supplyIndex >= 75 ? "high" : supplyIndex >= 40 ? "medium" : supplyIndex > 0 ? "low" : "unavailable"}/>
        <small className="tank-note">El nivel del tanque representa un índice por rangos; no es un volumen exacto del departamento.</small>
      </article>
      <article className="panel fuel-kpis">
        <div><small>VENDIENDO AHORA</small><b>{selling}</b><span>{total ? Math.round(selling / total * 100) : 0}% de estaciones</span></div>
        <div><small>DESPACHOS EN CURSO</small><b>{dispatches}</b><span>reposición informada</span></div>
        <div><small>SALDO COMPLETO</small><b>{counts.high}</b><span>más de 15.000 L</span></div>
        <div><small>SALDO BAJO</small><b>{counts.low}</b><span>menos de 5.000 L</span></div>
      </article>
    </div>

    <article className="panel status-distribution">
      <div><span className="panel-label">DISTRIBUCIÓN ACTUAL</span><h2>¿Cómo está el abastecimiento?</h2></div>
      <div className="status-buttons">
        {(["high", "medium", "low", "unavailable"] as FuelStatus[]).map((status) => <button key={status} className={`${statusInfo[status].tone} ${statusFilter === status ? "active" : ""}`} onClick={() => setStatusFilter(statusFilter === status ? "all" : status)}><b>{counts[status]}</b><span>{statusInfo[status].label}</span><i style={{ width: `${total ? counts[status] / total * 100 : 0}%` }}></i></button>)}
      </div>
    </article>

    <div className="fuel-analysis-grid">
      <article className="panel supply-trend">
        <div className="panel-label">ÍNDICE CRIPTOPULSO · CADA 30 MINUTOS</div><h2>Evolución del abastecimiento</h2>
        {trend.length > 1 ? <><div className="trend-summary"><span>Primer dato <b>{trend[0].index}</b></span><span>Último dato <b>{trend.at(-1)!.index}</b></span><span className={trendChange > 0 ? "up" : trendChange < 0 ? "down" : ""}>Variación <b>{trendChange > 0 ? "+" : ""}{trendChange}</b></span></div><div className="trend-chart-shell"><div className="trend-scale"><b>{trendMax}</b><span>{Math.round((trendMax + trendMin) / 2)}</span><b>{trendMin}</b></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Evolución real del índice de abastecimiento"><g>{[18,41.3,64.6,88].map((y) => <line key={y} x1="5" x2="96" y1={y} y2={y}/>)}</g><polyline points={chartPoints}/>{trend.map((point, index, values) => <circle key={point.time} cx={values.length === 1 ? 50 : 8 + index * (86 / (values.length - 1))} cy={chartY(point.index)} r="1.6"><title>{new Date(point.time).toLocaleString("es-BO")}: índice {point.index}/100 · completas {point.high} · aceptables {point.medium} · bajas {point.low}</title></circle>)}</svg></div><div className="trend-axis"><span>{new Date(trend[0].time).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span><span>{new Date(trend.at(-1)!.time).toLocaleString("es-BO", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></div>{rawTrendMin === rawTrendMax && <p className="trend-flat-note">La fuente mantuvo el mismo estado durante todo este periodo; por eso la línea es realmente horizontal.</p>}</> : <div className="history-empty"><b>El historial comienza hoy.</b><span>Cada consulta guardará una fotografía; pronto aparecerá la evolución por intervalos de 30 minutos.</span></div>}
      </article>
      <article className="panel useful-reading"><div className="panel-label">LECTURA ÚTIL</div><h2>¿Qué significa ahora?</h2><ul><li><b>{counts.high} estaciones</b> reportan un nivel superior a 15.000 litros.</li><li><b>{counts.low} estaciones</b> pueden requerir reposición pronto.</li><li><b>{total - selling} estaciones</b> no informan venta activa en este momento.</li><li><b>{dispatches} estaciones</b> tienen despacho en curso.</li></ul></article>
    </div>

    <article className="station-section">
      <div className="station-title"><div><span className="panel-label">ESTACIONES</span><h2>Tanques por estación</h2></div><span>{filtered.length} resultados</span></div>
      <div className="tank-list-controls panel"><div role="group" aria-label="Filtrar estaciones por nivel"><button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>Todas</button><button className={statusFilter === "high" ? "active" : ""} onClick={() => setStatusFilter("high")}>Más combustible</button><button className={statusFilter === "low" ? "active" : ""} onClick={() => setStatusFilter("low")}>Menos combustible</button></div><label>ORDENAR<select value={tankOrder} onChange={(event) => setTankOrder(event.target.value as TankOrder)}><option value="source">Orden de la fuente</option><option value="highest">Mayor a menor saldo</option><option value="lowest">Menor a mayor saldo</option></select></label></div>
      <div className="station-tank-grid">{shown.map((station) => { const info = statusInfo[station.status]; const mapUrl = station.latitude != null && station.longitude != null ? `https://www.google.com/maps/search/?api=1&query=${station.latitude},${station.longitude}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${station.name}, ${station.address}, ${departmentName}, Bolivia`)}`; return <article className={`station-tank-card panel ${info.tone}`} key={station.id}><LiquidTank status={station.status} compact/><div><div className="station-events">{station.dispatchInProgress && <span className="station-event dispatch">↻ Despacho en curso{station.dispatchAt ? ` · ${timeAgo(station.dispatchAt)}` : ""}</span>}{station.hasSales ? <span className="station-event sale">● Con venta: {timeAgo(station.lastSaleAt)}</span> : <span className="station-event quiet">○ Sin venta activa · última {timeAgo(station.lastSaleAt)}</span>}</div><h3>{station.name}</h3><p>{station.address}</p><b>{info.label}</b><span>{info.range}</span><a className="station-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer" aria-label={`Ver ${station.name} en Google Maps`}>⌖ Ver ubicación en el mapa</a></div></article>; })}</div>
      {filtered.length > 12 && <button className="show-stations" onClick={() => setShowAll(!showAll)}>{showAll ? "Mostrar menos" : `Ver las ${filtered.length} estaciones`}</button>}
    </article>
    <p className="fuel-disclaimer">Fuente: aplicación ANH Abastecimiento. CriptoPulso presenta análisis propios. Los tanques y porcentajes son representaciones de rangos, no mediciones exactas. La disponibilidad puede cambiar durante el traslado del usuario. <a href="/guias/como-interpretar-abastecimiento-combustibles">Consulta la metodología y aprende a interpretar los datos.</a></p>
  </section>;
}
