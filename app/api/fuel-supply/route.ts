import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANH_BASE = "https://abastecimiento.prod.anh.gob.bo/api";
const DEFAULT_CAPACITY = 25_000;
const LEARNING_THRESHOLD = 26_000;
const products = { gasoline: 0, diesel: 1, premium: 2, uls: 3 } as const;
const allowedOrigins = new Set(["https://mci-industria.web.app","https://mci-industria.firebaseapp.com","https://localhost","http://localhost:5173"]);
const corsHeaders = (request:NextRequest) => { const origin=request.headers.get("origin")??""; return {"Access-Control-Allow-Origin":allowedOrigins.has(origin)?origin:"https://mci-industria.web.app","Access-Control-Allow-Methods":"GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type",Vary:"Origin"}; };
export function OPTIONS(request:NextRequest){return new NextResponse(null,{status:204,headers:corsHeaders(request)});}
type Product = keyof typeof products;
type AnhStation = { id:number; nombre:string; direccion?:string; zona?:string; departamento_id:number; lat?:number|string; lng?:number|string; saldo_litros?:number|string; despacho_en_curso?:boolean; fecha_hora_despacho?:string|null; seguimiento_id?:number|null; con_venta?:boolean; fecha_ultima_venta?:string|null; updated_at?:string|null };
type PreviousSnapshot = { station_id:number; balance_liters:number; observed_bucket:string };
type CapacityProfile = { station_id:number; estimated_capacity_liters:number; max_reported_liters:number; readings_above_threshold:number; capacity_source:"default"|"learned" };
type DailyMetric = { station_id:number; local_day:string; estimated_sales_liters:number; estimated_restock_liters:number; restock_events:number; readings:number; first_reading:string; last_reading:string };

const bucketNow = () => { const date = new Date(); date.setUTCMinutes(Math.floor(date.getUTCMinutes()/15)*15,0,0); return date.toISOString(); };
const sourceDate = (value?:string|null) => !value ? null : /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}-04:00`;
const numberOrNull = (value?:number|string) => { const parsed=Number(value); return Number.isFinite(parsed)?parsed:null; };
const confidenceFor = (readings:number,days:number) => days>=7&&readings>=100?"high":days>=3&&readings>=24?"medium":"low";

export async function GET(request:NextRequest) {
  const department=Number(request.nextUrl.searchParams.get("department")??"2");
  const product=(request.nextUrl.searchParams.get("product")??"gasoline") as Product;
  if(!Number.isInteger(department)||department<1||department>9||!(product in products)) return NextResponse.json({error:"Filtro inválido"},{status:400});
  try {
    const upstream=await fetch(`${ANH_BASE}/estaciones/?departamento=${department}&producto=${products[product]}`,{headers:{Accept:"application/json","User-Agent":"CriptoPulso/2.0 public-information-analysis"},signal:AbortSignal.timeout(25_000),cache:"no-store"});
    if(!upstream.ok) throw new Error(`ANH ${upstream.status}`);
    const payload=await upstream.json();
    const sourceStations:AnhStation[]=Array.isArray(payload.oResultado)?payload.oResultado:[];
    const observedAt=new Date().toISOString(); const observedBucket=bucketNow();
    const stationIds=sourceStations.map(s=>s.id); const admin=createAdminClient();
    if(sourceStations.length){
      const {error}=await admin.from("fuel_stations").upsert(sourceStations.map(s=>({station_id:s.id,name:s.nombre,address:s.direccion??"",zone:s.zona??"",department_id:s.departamento_id,latitude:numberOrNull(s.lat),longitude:numberOrNull(s.lng),source_updated_at:sourceDate(s.updated_at),updated_at:observedAt})),{onConflict:"station_id"});
      if(error) throw error;
    }
    const previousByStation=new Map<number,PreviousSnapshot>(); const profilesByStation=new Map<number,CapacityProfile>();
    if(stationIds.length){
      const [{data:previous},{data:profiles}]=await Promise.all([
        admin.from("fuel_liter_snapshots").select("station_id,balance_liters,observed_bucket").eq("product",product).in("station_id",stationIds).lt("observed_bucket",observedBucket).order("observed_bucket",{ascending:false}).limit(stationIds.length*2),
        admin.from("fuel_capacity_profiles").select("station_id,estimated_capacity_liters,max_reported_liters,readings_above_threshold,capacity_source").eq("product",product).in("station_id",stationIds),
      ]);
      (previous??[]).forEach(row=>{if(!previousByStation.has(row.station_id)) previousByStation.set(row.station_id,row as PreviousSnapshot)});
      (profiles??[]).forEach(row=>profilesByStation.set(row.station_id,row as CapacityProfile));
    }
    const capacityRows:Array<Record<string,unknown>>=[]; const snapshotRows:Array<Record<string,unknown>>=[];
    const stations=sourceStations.map(station=>{
      const liters=Math.max(0,Math.round(Number(station.saldo_litros)||0)); const previous=previousByStation.get(station.id); const stored=profilesByStation.get(station.id);
      const previousCapacity=stored?.estimated_capacity_liters??DEFAULT_CAPACITY; const priorAbove=stored?.readings_above_threshold??0;
      const consistentHigh=liters>LEARNING_THRESHOLD&&Boolean(previous&&previous.balance_liters>LEARNING_THRESHOLD&&liters<=previous.balance_liters*1.25&&previous.balance_liters<=liters*1.25);
      const capacitySource=stored?.capacity_source==="learned"||consistentHigh?"learned":"default"; const capacity=capacitySource==="learned"?Math.max(previousCapacity,liters):DEFAULT_CAPACITY;
      const fillPercent=Math.min(100,Number((liters/capacity*100).toFixed(1))); const delta=previous?liters-previous.balance_liters:0;
      const elapsedHours=previous?Math.max(.25,(Date.parse(observedBucket)-Date.parse(previous.observed_bucket))/3_600_000):0; const restockThreshold=Math.max(2_000,Math.round(capacity*.2));
      const extraordinarySpike=Boolean(previous&&liters>Math.max(capacity*2,previous.balance_liters+capacity)); const estimatedOutflow=previous&&delta<0&&elapsedHours<=4?Math.abs(delta):0;
      const estimatedRestock=previous&&delta>=restockThreshold&&!extraordinarySpike?delta:0; let eventType=previous?"stable":"initial";
      if(extraordinarySpike) eventType="outlier"; else if(estimatedRestock&&station.despacho_en_curso) eventType="official_dispatch"; else if(estimatedRestock) eventType="estimated_restock"; else if(estimatedOutflow) eventType="estimated_sale"; else if(previous&&Math.abs(delta)>=restockThreshold) eventType="possible_correction";
      capacityRows.push({station_id:station.id,product,estimated_capacity_liters:capacity,max_reported_liters:Math.max(stored?.max_reported_liters??0,liters),readings_above_threshold:liters>LEARNING_THRESHOLD?priorAbove+1:priorAbove,capacity_source:capacitySource,updated_at:observedAt});
      snapshotRows.push({station_id:station.id,product,balance_liters:liters,estimated_capacity_liters:capacity,estimated_fill_percent:fillPercent,estimated_outflow_liters:estimatedOutflow,estimated_restock_liters:estimatedRestock,event_type:eventType,has_sales:Boolean(station.con_venta),last_sale_at:sourceDate(station.fecha_ultima_venta),dispatch_in_progress:Boolean(station.despacho_en_curso),dispatch_at:sourceDate(station.fecha_hora_despacho),tracking_id:station.seguimiento_id??null,source_updated_at:sourceDate(station.updated_at),observed_at:observedAt,observed_bucket:observedBucket});
      return {id:station.id,name:station.nombre,address:station.direccion??"",zone:station.zona??"",departmentId:station.departamento_id,latitude:numberOrNull(station.lat),longitude:numberOrNull(station.lng),liters,estimatedCapacityLiters:capacity,capacitySource,fillPercent,hasSales:Boolean(station.con_venta),lastSaleAt:sourceDate(station.fecha_ultima_venta),dispatchInProgress:Boolean(station.despacho_en_curso),dispatchAt:sourceDate(station.fecha_hora_despacho),trackingId:station.seguimiento_id??null,sourceUpdatedAt:sourceDate(station.updated_at),lastChangeLiters:previous?delta:null,eventType};
    });
    if(snapshotRows.length){
      const [{error:capacityError},{error:snapshotError}]=await Promise.all([admin.from("fuel_capacity_profiles").upsert(capacityRows,{onConflict:"station_id,product"}),admin.from("fuel_liter_snapshots").upsert(snapshotRows,{onConflict:"station_id,product,observed_bucket"})]);
      if(capacityError) throw capacityError; if(snapshotError) throw snapshotError;
    }
    const sinceThirtyDays=new Date(Date.now()-30*86_400_000).toISOString().slice(0,10);
    const [{data:trendRows},{data:dailyRows}]=await Promise.all([
      admin.from("fuel_liter_trend").select("observed_bucket,total,available,empty,selling,dispatches,total_liters,average_liters,median_liters,average_fill_percent,estimated_outflow_liters,estimated_restock_liters,index").eq("department_id",department).eq("product",product).gte("observed_bucket",new Date(Date.now()-7*86_400_000).toISOString()).order("observed_bucket",{ascending:true}).limit(672),
      admin.from("fuel_station_daily_metrics").select("station_id,local_day,estimated_sales_liters,estimated_restock_liters,restock_events,readings,first_reading,last_reading").eq("department_id",department).eq("product",product).gte("local_day",sinceThirtyDays).order("local_day",{ascending:true}).limit(1500),
    ]);
    const metrics=(dailyRows??[]) as DailyMetric[]; const stationMetrics=new Map<number,DailyMetric[]>();
    metrics.forEach(row=>stationMetrics.set(row.station_id,[...(stationMetrics.get(row.station_id)??[]),row]));
    const enrichedStations=stations.map(station=>{const rows=stationMetrics.get(station.id)??[]; const sales=rows.reduce((sum,row)=>sum+Number(row.estimated_sales_liters),0); const readings=rows.reduce((sum,row)=>sum+row.readings,0); const coveredHours=rows.reduce((sum,row)=>sum+Math.min(24,Math.max(.25,(Date.parse(row.last_reading)-Date.parse(row.first_reading))/3_600_000)+.25),0); const hourlyOutflow=coveredHours>=1?sales/coveredHours:0; const autonomyHours=hourlyOutflow>10?station.liters/hourlyOutflow:null; return {...station,estimatedHourlySales:Math.round(hourlyOutflow),autonomyHours:autonomyHours==null?null:Number(autonomyHours.toFixed(1)),confidence:confidenceFor(readings,rows.length)}});
    const dailyMap=new Map<string,{date:string;estimatedSalesLiters:number;estimatedRestockLiters:number;restockEvents:number}>();
    metrics.forEach(row=>{const aggregate=dailyMap.get(row.local_day)??{date:row.local_day,estimatedSalesLiters:0,estimatedRestockLiters:0,restockEvents:0}; aggregate.estimatedSalesLiters+=Number(row.estimated_sales_liters); aggregate.estimatedRestockLiters+=Number(row.estimated_restock_liters); aggregate.restockEvents+=row.restock_events; dailyMap.set(row.local_day,aggregate)});
    return NextResponse.json({stations:enrichedStations,trend:trendRows??[],daily:[...dailyMap.values()],sourceTime:payload.server_time??observedAt,observedAt,source:"ANH Abastecimiento",methodology:{official:"Litros, venta activa, despacho, ubicación y hora de actualización son reportados por ANH.",estimated:"Capacidad, porcentaje, ventas, recargas y autonomía son estimaciones de CriptoPulso calculadas por variación entre lecturas.",cadenceMinutes:15}},{headers:{...corsHeaders(request),"Cache-Control":"public, s-maxage=60, stale-while-revalidate=180"}});
  } catch(error){console.error("ANH liters fetch failed",error); return NextResponse.json({error:"La fuente ANH no respondió o el historial todavía no está preparado. Intenta nuevamente en unos minutos."},{status:502,headers:corsHeaders(request)})}
}
