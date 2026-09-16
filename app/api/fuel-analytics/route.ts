import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const maxDuration = 60;
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  const product = q.get("product") ?? "gasoline";
  const department = Number(q.get("department") ?? 0);
  const station = Number(q.get("station") ?? 0);
  const days = Number(q.get("days") ?? 7);
  if (!["gasoline","diesel","premium","uls"].includes(product) ||
      !Number.isInteger(department) || department < 0 || department > 9 ||
      !Number.isSafeInteger(station) || station < 0 || (station > 0 && !department) ||
      ![1,7,30].includes(days)) return NextResponse.json({error:"Filtros inválidos"},{status:400});
  try {
    const db = createAdminClient();
    if (station) {
      const {data,error} = await db.from("fuel_stations").select("station_id").eq("station_id",station).eq("department_id",department).maybeSingle();
      if(error) throw error;
      if(!data) return NextResponse.json({error:"La estación no pertenece al departamento"},{status:400});
    }
    const since = new Date(Date.now()-days*86400000).toISOString();
    const rows: Record<string, number|string|boolean>[] = [];
    for(let offset=0;;offset+=1000) {
      let query = station
        ? db.from("fuel_liter_snapshots").select("observed_bucket,balance_liters,estimated_fill_percent,estimated_capacity_liters,has_sales,dispatch_in_progress,estimated_outflow_liters,estimated_restock_liters").eq("station_id",station)
        : db.from("fuel_liter_trend").select("*");
      query = query.eq("product",product).gte("observed_bucket",since).order("observed_bucket",{ascending:true});
      if(!station) {
        if(department) query = query.eq("department_id",department);
        query = query.order("department_id",{ascending:true});
      }
      const {data,error} = await query.range(offset,offset+999);
      if(error) throw error;
      rows.push(...data);
      if(data.length<1000) break;
    }
    const points = rows.map(r => station ? {
      department_id:department, observed_bucket:String(r.observed_bucket), total:1,
      available:Number(r.balance_liters)>0?1:0, empty:Number(r.balance_liters)===0?1:0,
      selling:r.has_sales?1:0, dispatches:r.dispatch_in_progress?1:0,
      total_liters:Number(r.balance_liters), estimated_outflow_liters:Number(r.estimated_outflow_liters),
      estimated_restock_liters:Number(r.estimated_restock_liters),
      index:Math.round((Number(r.balance_liters)>0?40:0)+Number(r.estimated_fill_percent)*.25+
        (r.has_sales?20:0)+(Number(r.balance_liters)>=Number(r.estimated_capacity_liters)*.2?10:0)+(r.dispatch_in_progress?5:0)),
    } : {
      department_id:Number(r.department_id), observed_bucket:String(r.observed_bucket),total:Number(r.total),
      available:Number(r.available),empty:Number(r.empty),selling:Number(r.selling),dispatches:Number(r.dispatches),
      total_liters:Number(r.total_liters),estimated_outflow_liters:Number(r.estimated_outflow_liters),
      estimated_restock_liters:Number(r.estimated_restock_liters),index:Number(r.index),
    });
    return NextResponse.json({points,generatedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, s-maxage=120"}});
  } catch(error) {
    console.error("Fuel analytics",error);
    return NextResponse.json({error:"No se pudo consultar el historial. Vuelve a intentarlo."},{status:503});
  }
}
