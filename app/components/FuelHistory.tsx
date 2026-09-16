"use client";
import { useEffect, useState } from "react";

export type FuelPoint = {department_id:number;observed_bucket:string;total:number;available:number;empty:number;selling:number;dispatches:number;total_liters:number;estimated_outflow_liters:number;estimated_restock_liters:number;index:number};
export const fuelDepartments = ["","Chuquisaca","La Paz","Cochabamba","Oruro","Potosí","Tarija","Santa Cruz","Beni","Pando"];
export const fuelProducts = {gasoline:"Gasolina",diesel:"Diésel",premium:"Premium",uls:"Diésel Oil Plus"};
export const fuelNumber = (n:number) => new Intl.NumberFormat("es-BO",{maximumFractionDigits:0}).format(n);
export function useFuelHistory(product:string,department:number,station:number,days:number) {
  const [state,setState] = useState<{points:FuelPoint[];loading:boolean;error:string}>({points:[],loading:true,error:""});
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      setState({points:[],loading:true,error:""});
      try {
        const response=await fetch(`/api/fuel-analytics?product=${product}&department=${department}&station=${station}&days=${days}`,{signal:controller.signal});
        const body=await response.json();
        if(!response.ok) throw new Error(body.error);
        setState({points:body.points,loading:false,error:""});
      } catch(e) {if(!controller.signal.aborted)setState({points:[],loading:false,error:e instanceof Error?e.message:"Error de consulta"});}
    }
    void load(); const timer=setInterval(load,300000);
    return()=>{controller.abort();clearInterval(timer)};
  },[product,department,station,days]);
  return state;
}
export function FuelChart({points,metric,label}:{points:FuelPoint[];metric:"total_liters"|"index";label:string}){
  const [selected,setSelected]=useState<number|null>(null);
  if(points.length<2)return <p className="history-empty">Se necesitan dos lecturas para mostrar la evolución.</p>;
  const values=points.map(p=>p[metric]);const low=metric==="index"?0:Math.max(0,Math.min(...values)*.95);
  const high=metric==="index"?100:Math.max(low+1,...values)*1.05;
  const first=Date.parse(points[0].observed_bucket),span=Math.max(1,Date.parse(points.at(-1)!.observed_bucket)-first);
  const position=(p:FuelPoint)=>[35+(Date.parse(p.observed_bucket)-first)/span*630,190-(p[metric]-low)/(high-low)*165];
  const p=points[selected??points.length-1]??points.at(-1)!;
  return <><svg className="analytics-chart" viewBox="0 0 700 220" role="img" aria-label={label}>
    {[0,.5,1].map(v=><g key={v}><line x1="35" x2="665" y1={190-v*165} y2={190-v*165} stroke="#284638"/><text x="35" y={185-v*165} fill="#9bb5ab" fontSize="10">{fuelNumber(low+v*(high-low))}</text></g>)}
    <polyline fill="none" stroke="#22d9ac" strokeWidth="3" points={points.map(p=>position(p).join(",")).join(" ")}/>
  </svg><label className="history-scrubber">Explorar lecturas<input aria-label={label+" fecha"} type="range" min="0" max={points.length-1} value={selected==null?points.length-1:Math.min(selected,points.length-1)} onChange={e=>setSelected(Number(e.target.value))}/></label>
  <p>{new Date(p.observed_bucket).toLocaleString("es-BO",{timeZone:"America/La_Paz"})} · <strong>{fuelNumber(p[metric])}{metric==="index"?" /100":" L"}</strong> · {p.total} estaciones</p></>;
}
export function FuelHistoryPanels({points}:{points:FuelPoint[]}){
  const daily=new Map<string,{sales:number;restock:number}>();
  for(const p of points){
    const date=new Date(Date.parse(p.observed_bucket)-4*3600000).toISOString().slice(0,10);
    const row=daily.get(date)??{sales:0,restock:0};
    row.sales+=p.estimated_outflow_liters;row.restock+=p.estimated_restock_liters;daily.set(date,row);
  }
  const max=Math.max(1,...[...daily.values()].flatMap(d=>[d.sales,d.restock]));
  return <div className="national-grid">
    <article className="panel analytics-panel"><h2>Evolución del saldo total</h2><FuelChart points={points} metric="total_liters" label="Saldo en litros"/></article>
    <article className="panel analytics-panel"><h2>Evolución del abastecimiento</h2><FuelChart points={points} metric="index" label="Índice de abastecimiento"/></article>
    <article className="panel analytics-panel analytics-wide"><h2>Ventas y recargas diarias</h2><p>Estimaciones por cambios de saldo. El primer y último día pueden estar incompletos.</p>
      {!daily.size&&<p>Sin lecturas para este filtro.</p>}
      {[...daily].map(([date,d])=><div className="fuel-day" key={date}><span>{date}</span><div><i style={{width:`${d.sales/max*100}%`,background:"#69a6ff"}}/><i style={{width:`${d.restock/max*100}%`,background:"#ab8dff"}}/></div><span>{fuelNumber(d.sales)} / {fuelNumber(d.restock)} L</span></div>)}
      <p>🔵 Ventas estimadas · 🟣 Recargas estimadas</p>
    </article>
  </div>;
}
export default function StationFuelHistory({department,product,stations}:{department:number;product:string;stations:{id:number;name:string}[]}){
  const [station,setStation]=useState(0);const [days,setDays]=useState(7);
  const {points,loading,error}=useFuelHistory(product,department,station,days);
  return <section className="fuel-history"><div className="panel analytics-controls">
    <label>Estación para los tres gráficos<select value={station} onChange={e=>setStation(Number(e.target.value))}><option value="0">Todas · {fuelDepartments[department]}</option>{stations.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <label>Periodo<select value={days} onChange={e=>setDays(Number(e.target.value))}><option value="1">Últimas 24 horas</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option></select></label>
    <p>{station?stations.find(s=>s.id===station)?.name:"Consolidado departamental"} · {fuelProducts[product as keyof typeof fuelProducts]}</p>
  </div>{loading?<p role="status">Consultando historial…</p>:error?<p role="alert">{error}</p>:<FuelHistoryPanels points={points}/>}</section>;
}
