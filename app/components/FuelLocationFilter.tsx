"use client";
import { useEffect, useRef, useState } from "react";
import "./fuel-location.css";
export type FuelLocation={latitude:number;longitude:number;accuracy?:number};
export function distanceKm(origin:FuelLocation,latitude:number|null,longitude:number|null):number|null{
  if(latitude===null||longitude===null||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180||(latitude===0&&longitude===0))return null;
  const rad=Math.PI/180;
  const a=Math.sin((latitude-origin.latitude)*rad/2)**2+Math.cos(origin.latitude*rad)*Math.cos(latitude*rad)*Math.sin((longitude-origin.longitude)*rad/2)**2;
  return 6371*2*Math.atan2(Math.sqrt(Math.min(1,a)),Math.sqrt(Math.max(0,1-a)));
}
export default function FuelLocationFilter({location,radius,onLocation,onRadius,department}:{location:FuelLocation|null;radius:number;onLocation:(value:FuelLocation|null)=>void;onRadius:(value:number)=>void;department:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [lat,setLat]=useState(""),[lng,setLng]=useState("");
  const request=useRef(0);
  useEffect(()=>()=>{request.current++},[]);
  function locate(){
    if(!navigator.geolocation){setError("Tu navegador no ofrece ubicación. Puedes introducir coordenadas abajo.");return;}
    const id=++request.current;setBusy(true);setError("");
    navigator.geolocation.getCurrentPosition(position=>{
      if(id!==request.current)return;
      const {latitude,longitude,accuracy}=position.coords;
      onLocation({latitude,longitude,accuracy});setLat(latitude.toFixed(6));setLng(longitude.toFixed(6));setBusy(false);
    },cause=>{if(id!==request.current)return;setBusy(false);setError(cause.code===1?"Permiso de ubicación denegado. Actívalo en el navegador o introduce coordenadas.":cause.code===3?"La ubicación tardó demasiado. Intenta de nuevo o introduce coordenadas.":"No se pudo obtener tu ubicación. Activa la localización del dispositivo o introduce coordenadas.");},{enableHighAccuracy:true,timeout:15000,maximumAge:60000});
  }
  function manual(){
    const latitude=Number(lat.trim().replace(",",".")),longitude=Number(lng.trim().replace(",","."));
    if(!lat.trim()||!lng.trim()||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180){setError("Introduce una latitud entre −90 y 90 y una longitud entre −180 y 180.");return;}
    request.current++;setBusy(false);setError("");onLocation({latitude,longitude});
  }
  return <article className="panel fuel-location"><h2>Cerca de mi ubicación</h2>
    <div className="fuel-location-controls"><button type="button" onClick={locate} disabled={busy}>{busy?"Obteniendo ubicación…":location?"Actualizar mi ubicación":"Usar mi ubicación"}</button>
    <label>Radio de búsqueda<select value={radius} onChange={e=>onRadius(Number(e.target.value))}>{[2,5,10,25,50,100,0].map(km=><option key={km} value={km}>{km?`${km} km`:"Sin límite · ordenar por cercanía"}</option>)}</select></label>
    {(location||busy)&&<button type="button" onClick={()=>{request.current++;setBusy(false);setError("");onLocation(null);}}>Quitar ubicación</button>}</div>
    <p>Filtra el listado de estaciones de <strong>{department}</strong>, junto al producto, buscador y disponibilidad elegidos. Los totales y gráficos siguen mostrando su alcance indicado.</p>
    {location&&<p role="status">Punto seleccionado: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}.{location.accuracy!=null?` Precisión aproximada: ${Math.round(location.accuracy)} m.`:""} Distancias en línea recta; el recorrido por carretera puede ser mayor.</p>}
    {location?.accuracy!=null&&radius>0&&location.accuracy>radius*1000&&<p>La precisión de tu ubicación es menor que el radio elegido. Amplía el radio o introduce un punto más preciso.</p>}
    {error&&<p role="alert">{error}</p>}
    <details><summary>Elegir otra ubicación con coordenadas</summary><p>Puedes copiar la latitud y longitud de un punto en tu aplicación de mapas.</p><div className="fuel-location-controls"><label>Latitud<input inputMode="decimal" value={lat} onChange={e=>setLat(e.target.value)} placeholder="Ej.: -19.0333"/></label><label>Longitud<input inputMode="decimal" value={lng} onChange={e=>setLng(e.target.value)} placeholder="Ej.: -65.2627"/></label><button type="button" onClick={manual}>Aplicar punto</button></div></details>
    <small>Tu punto se utiliza en este navegador y no se guarda en nuestra base de datos. Selecciona el departamento correspondiente arriba.</small>
  </article>;
}
