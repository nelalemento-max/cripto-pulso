"use client";
import Link from "next/link";
import "./fuel-analytics.css";
import { useRef, useState } from "react";
import { FuelHistoryPanels, FuelPoint, fuelDepartments, fuelProducts, fuelNumber, useFuelHistory } from "./FuelHistory";

export default function FuelBoliviaDashboard(){
  const [product,setProduct]=useState("gasoline"),[days,setDays]=useState(7),[department,setDepartment]=useState(0);
  const [metric,setMetric]=useState<"total_liters"|"available"|"empty"|"selling"|"index">("total_liters");
  const {points,loading,error}=useFuelHistory(product,0,0,days);
  const mapRef=useRef<HTMLObjectElement>(null);
  const [positions,setPositions]=useState<{id:number;x:number;y:number}[]>([]);
  const latest=new Map<number,FuelPoint>();
  for(const p of points)latest.set(p.department_id,p);
  const rows=[...latest.values()];
  const fresh=rows.filter(r=>Date.now()-Date.parse(r.observed_bucket)<=60*60000);
  const totals=fresh.reduce((a,p)=>({liters:a.liters+p.total_liters,total:a.total+p.total,empty:a.empty+p.empty,selling:a.selling+p.selling}),{liters:0,total:0,empty:0,selling:0});
  const max=Math.max(1,...rows.map(r=>r[metric]));
  // Only complete national buckets are compared: changing coverage must not simulate stock changes.
  const buckets=new Map<string,FuelPoint[]>();
  for(const p of points)buckets.set(p.observed_bucket,[...(buckets.get(p.observed_bucket)??[]),p]);
  const national=[...buckets.values()].filter(group=>new Set(group.map(p=>p.department_id)).size===9).map(group=>{
    const base={...group[0],department_id:0,total:0,available:0,empty:0,selling:0,dispatches:0,total_liters:0,estimated_outflow_liters:0,estimated_restock_liters:0,index:0};
    for(const p of group){base.total+=p.total;base.available+=p.available;base.empty+=p.empty;base.selling+=p.selling;base.dispatches+=p.dispatches;base.total_liters+=p.total_liters;base.estimated_outflow_liters+=p.estimated_outflow_liters;base.estimated_restock_liters+=p.estimated_restock_liters;base.index+=p.index*p.total;}
    base.index=Math.round(base.index/Math.max(1,base.total));return base;
  });
  const selected=department?points.filter(p=>p.department_id===department):national;
  function prepareMap(){
    const doc=mapRef.current?.contentDocument;if(!doc)return;
    doc.querySelectorAll("text").forEach(label=>label.style.setProperty("display","none","important"));
    const ids=[6,5,1,4,3,7,2,8,9];
    const paths=Array.from(doc.querySelectorAll("svg > path")).slice(0,9) as SVGPathElement[];
    setPositions(paths.map((path,i)=>{
      path.style.setProperty("fill","#133c32","important");path.style.setProperty("stroke","#6b9c8a","important");
      const b=path.getBBox();return{id:ids[i],x:(b.x+b.width/2)/2000*100,y:(b.y+b.height/2)/2208*100};
    }));
  }
  return <section className="page fuel-page national-page">
    <header className="fuel-hero"><div><span className="live-dot">OBSERVATORIO NACIONAL · FUENTE ANH</span><h1>Bolivia <i>en combustible</i></h1><p>Compara la disponibilidad reportada, detecta diferencias regionales y explora el movimiento del abastecimiento.</p></div></header>
    <div className="panel analytics-controls"><label>Producto<select value={product} onChange={e=>setProduct(e.target.value)}>{Object.entries(fuelProducts).map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label><label>Periodo histórico<select value={days} onChange={e=>setDays(Number(e.target.value))}>{[1,7,30].map(n=><option value={n} key={n}>{n===1?"24 horas":n+" días"}</option>)}</select></label><label>Barras del mapa<select value={metric} onChange={e=>setMetric(e.target.value as typeof metric)}><option value="total_liters">Litros reportados</option><option value="available">Estaciones con saldo</option><option value="empty">Estaciones vacías</option><option value="selling">Venta activa</option><option value="index">Índice /100</option></select></label></div>
    {loading?<p role="status">Consultando los nueve departamentos…</p>:error?<p role="alert">{error}</p>:<>
    <p className="coverage-note">Cobertura reciente: <b>{fresh.length}/9 departamentos</b>. Totales calculados con la última lectura de cada departamento recibida en los últimos 60 minutos. {fresh.length<9?"Consolidado parcial; no equivale al total nacional completo.":""}</p>
    <div className="national-kpis">{[["Saldo reportado",fuelNumber(totals.liters)+" L"],["Estaciones observadas",fuelNumber(totals.total)],["Venta activa",fuelNumber(totals.selling)],["Saldo cero",fuelNumber(totals.empty)]].map(([label,value])=><article className="panel" key={label}><small>{label}</small><strong>{value}</strong></article>)}</div>
    <div className="national-grid"><article className="panel analytics-panel"><h2>El pulso de los departamentos</h2><p>Toca una barra para explorar su historial.</p><div className="fuel-national-map"><object ref={mapRef} data="/bolivia-departments.svg" type="image/svg+xml" aria-label="Mapa de Bolivia" onLoad={prepareMap}/>{positions.map(pos=>{const row=latest.get(pos.id);return <button key={pos.id} className={department===pos.id?"selected":""} style={{left:pos.x+"%",top:pos.y+"%"}} onClick={()=>setDepartment(pos.id)} aria-label={fuelDepartments[pos.id]+": "+(row?fuelNumber(row[metric]):"sin datos")}><i style={{height:row?12+row[metric]/max*65:4}}/><b>{fuelDepartments[pos.id]}</b><span>{row?fuelNumber(row[metric]):"Sin datos"}</span></button>})}</div></article>
    <article className="panel analytics-panel"><h2>Comparación departamental</h2><p>{metric==="total_liters"?"Litros reportados":metric==="index"?"Índice estimado /100":"Número de estaciones"} · último registro disponible</p>{Array.from({length:9},(_,i)=>i+1).sort((a,b)=>(latest.get(b)?.[metric]??-1)-(latest.get(a)?.[metric]??-1)).map(id=>{const r=latest.get(id);return <button className="national-rank" key={id} onClick={()=>setDepartment(id)}><span>{fuelDepartments[id]}<small>{r?new Date(r.observed_bucket).toLocaleString("es-BO",{timeZone:"America/La_Paz"}):"Sin datos"}{r&&Date.now()-Date.parse(r.observed_bucket)>3600000?" · ANTIGUO":""}</small></span><strong>{r?fuelNumber(r[metric]):"—"}</strong><i style={{width:r?r[metric]/max*100+"%":"0%"}}/></button>})}</article></div>
    <div className="panel analytics-controls"><label>Historial a explorar<select value={department} onChange={e=>setDepartment(Number(e.target.value))}>{fuelDepartments.map((name,id)=><option key={id} value={id}>{id?name:"Bolivia · nueve departamentos"}</option>)}</select></label><p>{department?"Historial de "+fuelDepartments[department]:"La evolución nacional compara únicamente intervalos con los nueve departamentos; los periodos incompletos se omiten."}</p></div>
    <FuelHistoryPanels key={product+"-"+department+"-"+days} points={selected} dailyPoints={department?selected:points}/>
    <article className="panel analytics-panel"><h2>Cómo interpretar esta vista</h2><p>Los litros reflejan saldos publicados por ANH, no la capacidad física certificada. Venta activa y saldo cero pueden coexistir por diferencias en la actualización de la fuente. Las ventas y recargas se estiman a partir de variaciones y pueden omitir movimientos entre consultas.</p><p>El índice nacional pondera el índice departamental por número de estaciones. Las barras comparan volúmenes absolutos: un departamento con más estaciones puede acumular más litros sin tener mejor cobertura territorial.</p><Link href="/metodologia">Consultar metodología</Link></article>
    </>}
  </section>;
}
