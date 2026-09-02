"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import FuelSupplyDashboard from "@/app/components/FuelSupplyDashboard";

type Coin = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change: number;
  cap: string;
  volume: string;
  signal: string;
  confidence: number;
};
type Holding = {
  symbol: string;
  amount: number;
  avg: number;
  stopLoss?: number;
};
type TradeLog = {
  id: number;
  side: "Compra" | "Venta";
  symbol: string;
  entry: number;
  exit?: number;
  usd: number;
  result: number;
};
type PaymentRequest = {
  id: string;
  full_name: string;
  email: string;
  whatsapp?: string;
  country: string;
  plan: string;
  payment_method: string;
  amount_label: string;
  paid_amount: string;
  payment_reference?: string;
  receipt_path: string;
  receipt_url?: string;
  status: string;
  created_at: string;
};
type CommunityComment = {
  id?: string;
  name: string;
  badge: string;
  asset: string;
  text: string;
  useful: number;
  score: number;
  status?: "published" | "reviewed" | "hidden";
};
type VisitMetrics = {
  today: number;
  sevenDays: number;
  pageViews: number;
  topPage: string;
  devices: Record<string, number>;
  pages?: Record<string, number>;
};
type VisitorFeedback = {
  id: string;
  answer: string;
  section: string;
  device: string;
  created_at: string;
};
type BasketPriceReport = {
  id: string; product: string; price: number; unit: string; department: string;
  city: string; market: string; purchased_on: string; status?: string; created_at?: string; estimated?: boolean;
};

const basketProducts = ["Carne de res", "Pollo", "Huevos", "Arroz", "Aceite", "AzÃºcar", "Harina", "Fideo", "Papa", "Tomate", "Cebolla", "Leche"];
const basketProductUnits: Record<string, string> = {
  "Carne de res": "kg", Pollo: "kg", Huevos: "docena", Arroz: "kg", Aceite: "litro", AzÃºcar: "kg",
  Harina: "kg", Fideo: "kg", Papa: "kg", Tomate: "kg", Cebolla: "kg", Leche: "litro",
};
const boliviaDepartments = ["La Paz", "Santa Cruz", "Cochabamba", "Chuquisaca", "Tarija", "Oruro", "PotosÃ­", "Beni", "Pando"];
const nationalReferences: Record<string, { price: number; unit: string; source: string }> = {
  "Carne de res": { price: 108, unit: "kg", source: "OAP Â· referencia nacional mayo 2026" },
  Pollo: { price: 35.5, unit: "kg", source: "OAP Â· referencia nacional mayo 2026" },
  Huevos: { price: 28, unit: "docena", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Arroz: { price: 13.67, unit: "kg", source: "CRAMA Tarija Â· marzo 2026" },
  Aceite: { price: 18, unit: "litro", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  AzÃºcar: { price: 6.17, unit: "kg", source: "CRAMA Tarija Â· marzo 2026" },
  Harina: { price: 9.5, unit: "kg", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Fideo: { price: 14, unit: "kg", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Papa: { price: 7.5, unit: "kg", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Tomate: { price: 10, unit: "kg", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Cebolla: { price: 8, unit: "kg", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
  Leche: { price: 8.5, unit: "litro", source: "EstimaciÃ³n referencial Â· agosto 2026 Â· no oficial" },
};
const departmentPriceFactors: Record<string, number> = { "La Paz": 1.04, "Santa Cruz": .98, Cochabamba: .97, Chuquisaca: 1.01, Tarija: .99, Oruro: 1.05, PotosÃ­: 1.08, Beni: 1.11, Pando: 1.16 };
const departmentCapitals: Record<string, string> = { "La Paz": "La Paz", "Santa Cruz": "Santa Cruz de la Sierra", Cochabamba: "Cochabamba", Chuquisaca: "Sucre", Tarija: "Tarija", Oruro: "Oruro", PotosÃ­: "PotosÃ­", Beni: "Trinidad", Pando: "Cobija" };
const estimatedBasketReports: BasketPriceReport[] = boliviaDepartments.flatMap((department, departmentIndex) =>
  basketProducts.flatMap((product, productIndex) => [
    { date: "2026-08-02", movement: .985 }, { date: "2026-08-06", movement: 1.012 }, { date: "2026-08-10", movement: 1 },
  ].map((point, pointIndex) => ({
    id: `estimate-${departmentIndex}-${productIndex}-${pointIndex}`, product,
    price: Number((nationalReferences[product].price * departmentPriceFactors[department] * point.movement).toFixed(2)),
    unit: basketProductUnits[product], department, city: departmentCapitals[department], market: "Referencia estimada departamental",
    purchased_on: point.date, estimated: true,
  }))),
);
const svgDepartmentOrder = ["Tarija", "PotosÃ­", "Chuquisaca", "Oruro", "Cochabamba", "Santa Cruz", "La Paz", "Beni", "Pando"];

function BoliviaDepartmentMap({ selected, reports, onSelect }: { selected: string; reports: BasketPriceReport[]; onSelect: (department: string) => void }) {
  const mapRef = useRef<HTMLObjectElement>(null);
  const prepareMap = () => {
    const document = mapRef.current?.contentDocument;
    if (!document) return;
    const paths = Array.from(document.querySelectorAll("svg > path")).slice(0, 9) as SVGPathElement[];
    paths.forEach((path, index) => {
      const department = svgDepartmentOrder[index];
      const active = selected === department;
      const count = reports.filter((report) => report.department === department).length;
      path.style.setProperty("fill", active ? "#18b889" : index % 2 ? "#102a22" : "#123128", "important");
      path.style.setProperty("stroke", active ? "#b9ffe8" : "#70998a", "important");
      path.style.setProperty("stroke-width", active ? "9" : "5", "important");
      path.style.setProperty("cursor", "pointer", "important");
      path.style.setProperty("filter", active ? "drop-shadow(0 0 24px #17d8a1)" : "drop-shadow(0 5px 4px #0008)", "important");
      path.style.transition = "fill .2s, stroke .2s, filter .2s";
      path.setAttribute("tabindex", "0");
      path.setAttribute("role", "button");
      path.setAttribute("aria-label", `${department}, ${count} reportes verificados`);
      path.onclick = () => onSelect(department);
      path.onmouseenter = () => { if (!active) path.style.setProperty("fill", "#17644f", "important"); };
      path.onmouseleave = () => { if (!active) path.style.setProperty("fill", index % 2 ? "#102a22" : "#123128", "important"); };
      path.onkeydown = (event) => { if (event.key === "Enter" || event.key === " ") onSelect(department); };
    });
    document.querySelectorAll("svg > text").forEach((label) => {
      (label as SVGTextElement).style.setProperty("fill", "#eaf7f2", "important");
      (label as SVGTextElement).style.setProperty("font-family", "Arial, sans-serif", "important");
      (label as SVGTextElement).style.setProperty("font-weight", "700", "important");
      (label as SVGTextElement).style.pointerEvents = "none";
    });
  };
  useEffect(prepareMap, [selected, reports]);
  return <object ref={mapRef} className="bolivia-department-map" data="/bolivia-departments.svg" type="image/svg+xml" aria-label="Mapa real e interactivo de los departamentos de Bolivia" onLoad={prepareMap}>Mapa de Bolivia</object>;
}

const dollarHistory = [
  { m: "Ago 25", official: 6.96, p2p: 14.12 },
  { m: "Sep", official: 6.96, p2p: 13.54 },
  { m: "Oct", official: 6.96, p2p: 12.91 },
  { m: "Nov", official: 6.96, p2p: 11.83 },
  { m: "Dic", official: 6.96, p2p: 10.74 },
  { m: "Ene 26", official: 6.96, p2p: 10.42 },
  { m: "Feb", official: 6.96, p2p: 10.89 },
  { m: "Mar", official: 6.96, p2p: 11.31 },
  { m: "Abr", official: 6.96, p2p: 11.68 },
  { m: "May", official: 8.94, p2p: 11.47 },
  { m: "Jun", official: 10.22, p2p: 11.35 },
  { m: "Hoy", official: 11.86, p2p: 11.18 },
];
const communitySeed: CommunityComment[] = [
  {
    name: "LucÃ­a Quant",
    badge: "Analista destacada",
    asset: "BTC",
    text: "La seÃ±al mejorÃ³ cuando el volumen confirmÃ³ la ruptura. PracticarÃ­a con una posiciÃ³n pequeÃ±a y un lÃ­mite de pÃ©rdida.",
    useful: 48,
    score: 4.9,
  },
  {
    name: "Marco V.",
    badge: "Pulso experto",
    asset: "USD/BOB",
    text: "Conviene comparar el oficial con P2P y no mezclarlos: responden a mercados y condiciones diferentes.",
    useful: 35,
    score: 4.7,
  },
  {
    name: "Ana Crypto",
    badge: "Comentario Ãºtil",
    asset: "ETH",
    text: "La tendencia es alcista, pero esperarÃ­a el cierre de la vela antes de entrar para evitar una falsa ruptura.",
    useful: 29,
    score: 4.6,
  },
];
const regionalFuel = [
  { country: "Bolivia", gasoline: 0.59, diesel: 0.81, lpg: 0.19 },
  { country: "Brasil", gasoline: 1.17, diesel: 1.29, lpg: 0.78 },
  { country: "Paraguay", gasoline: 1.1, diesel: 1.34, lpg: 0.72 },
  { country: "Argentina", gasoline: 1.36, diesel: 1.51, lpg: 0.52 },
  { country: "PerÃº", gasoline: 1.2, diesel: 1.78, lpg: 0.63 },
  { country: "Chile", gasoline: 1.59, diesel: 1.31, lpg: 0.73 },
];

const academyModules = [
  {
    id: "fundamentos",
    number: "01",
    title: "Fundamentos cripto",
    summary: "Comprende blockchain, Bitcoin, wallets y seguridad desde cero.",
    lessons: [
      { title: "QuÃ© es una criptomoneda", content: "Una criptomoneda es un activo digital registrado en una red distribuida. Aprende la diferencia entre moneda, token, precio, utilidad y capitalizaciÃ³n.", practice: "Compara Bitcoin, Ether y USDT e identifica para quÃ© se utiliza cada uno." },
      { title: "CÃ³mo funciona blockchain", content: "Los movimientos se agrupan en bloques enlazados y validados por una red. La trazabilidad no significa que toda red sea segura o que su precio vaya a subir.", practice: "Ubica una transacciÃ³n pÃºblica en un explorador y reconoce red, comisiÃ³n y confirmaciones." },
      { title: "Wallets y claves", content: "La wallet administra claves; la red conserva los activos. La frase semilla y la clave privada nunca deben compartirse ni guardarse en capturas de pantalla.", practice: "Clasifica ejemplos entre wallet custodial, no custodial, caliente y frÃ­a." },
      { title: "Stablecoins y redes", content: "Una stablecoin busca mantener una referencia, pero conserva riesgos de emisor, reserva, red y liquidez. Enviar por una red incorrecta puede causar pÃ©rdidas.", practice: "Simula un envÃ­o de USDT e identifica activo, red, direcciÃ³n y comisiÃ³n antes de confirmar." },
    ],
  },
  {
    id: "mercado",
    number: "02",
    title: "Leer el mercado",
    summary: "Interpreta velas, tendencias, soportes y resistencias.",
    lessons: [
      { title: "AnatomÃ­a de una vela", content: "Apertura, cierre, mÃ¡ximo y mÃ­nimo resumen el movimiento de un periodo. El cuerpo muestra direcciÃ³n y las mechas reflejan rechazo o volatilidad.", practice: "Identifica una vela alcista, una bajista y una de indecisiÃ³n en el grÃ¡fico." },
      { title: "Temporalidades", content: "Una seÃ±al puede ser alcista en 15 minutos y bajista en un dÃ­a. Primero se observa el marco mayor y luego se busca una entrada en el menor.", practice: "Compara el mismo activo en 1H, 4H y 1D y anota quÃ© cambia." },
      { title: "Tendencia y estructura", content: "MÃ¡ximos y mÃ­nimos ascendentes forman una tendencia alcista; descendentes, una bajista. Un movimiento lateral requiere reglas distintas.", practice: "Marca los Ãºltimos tres mÃ¡ximos y mÃ­nimos y clasifica la estructura." },
      { title: "Soporte y resistencia", content: "Son zonas donde el precio reaccionÃ³, no lÃ­neas exactas. Una ruptura necesita confirmaciÃ³n de cierre y, preferentemente, volumen.", practice: "Dibuja dos zonas y define quÃ© invalidarÃ­a tu lectura." },
    ],
  },
  {
    id: "indicadores",
    number: "03",
    title: "Indicadores tÃ©cnicos",
    summary: "Usa RSI, MACD, medias mÃ³viles y volumen sin depender de uno solo.",
    lessons: [
      { title: "RSI", content: "El RSI mide impulso. Sobrecompra o sobreventa no son Ã³rdenes automÃ¡ticas: una tendencia fuerte puede mantener valores extremos.", practice: "Compara el RSI con la estructura del precio antes de decidir." },
      { title: "Medias mÃ³viles", content: "Suavizan el precio y ayudan a observar direcciÃ³n. Son indicadores retrasados y funcionan peor en mercados laterales.", practice: "Observa si el precio estÃ¡ sobre o debajo de las medias y busca confirmaciÃ³n." },
      { title: "MACD", content: "Muestra relaciÃ³n entre medias e impulso mediante cruces e histograma. Los cruces tardÃ­os deben analizarse junto con precio y volumen.", practice: "Encuentra un cruce que funcionÃ³ y otro que produjo una seÃ±al falsa." },
      { title: "Volumen y confluencia", content: "El volumen ayuda a validar interÃ©s. Confluencia significa que estructura, nivel, impulso y riesgo apoyan una misma hipÃ³tesis.", practice: "Construye una lista de cuatro confirmaciones antes de practicar una entrada." },
    ],
  },
  {
    id: "riesgo",
    number: "04",
    title: "GestiÃ³n de riesgo",
    summary: "Protege el capital con lÃ­mites, tamaÃ±o de posiciÃ³n y disciplina.",
    lessons: [
      { title: "Riesgo por operaciÃ³n", content: "Define cuÃ¡nto aceptarÃ­as perder antes de entrar. Una referencia educativa conservadora suele ser una fracciÃ³n pequeÃ±a del capital, no una apuesta total.", practice: "Calcula el monto de riesgo para tres tamaÃ±os de cuenta virtual." },
      { title: "Stop loss e invalidaciÃ³n", content: "El stop se ubica donde la idea deja de ser vÃ¡lida, no donde la pÃ©rdida resulta cÃ³moda. DespuÃ©s se calcula el tamaÃ±o de la posiciÃ³n.", practice: "Define entrada, invalidaciÃ³n y pÃ©rdida mÃ¡xima antes de comprar." },
      { title: "RelaciÃ³n riesgo/beneficio", content: "Compara la pÃ©rdida posible con la ganancia objetivo. Una buena relaciÃ³n no garantiza Ã©xito si la probabilidad es baja.", practice: "EvalÃºa tres escenarios y descarta los que no compensan el riesgo." },
      { title: "Diario y disciplina", content: "Registrar motivo, emociÃ³n, entrada, salida y resultado permite detectar errores repetidos. No se persigue una pÃ©rdida con una operaciÃ³n impulsiva.", practice: "Completa una ficha antes y despuÃ©s de una prÃ¡ctica en el simulador." },
    ],
  },
  {
    id: "simulacion",
    number: "05",
    title: "SimulaciÃ³n guiada",
    summary: "Convierte el anÃ¡lisis en un plan medible usando dinero virtual.",
    lessons: [
      { title: "Preparar una hipÃ³tesis", content: "Una hipÃ³tesis incluye direcciÃ³n, razones, punto de entrada, invalidaciÃ³n y objetivo. Debe poder demostrarse equivocada.", practice: "Redacta tu hipÃ³tesis en una sola frase antes de operar." },
      { title: "Ejecutar sin improvisar", content: "La entrada se realiza solo si se cumplen las condiciones. Cambiar las reglas durante la operaciÃ³n impide evaluar el mÃ©todo.", practice: "Realiza una compra virtual respetando el lÃ­mite de pÃ©rdida configurado." },
      { title: "Cerrar y medir", content: "Una operaciÃ³n se evalÃºa por cumplimiento del plan, no solo por dinero ganado. Una buena decisiÃ³n tambiÃ©n puede terminar en pÃ©rdida.", practice: "Cierra una posiciÃ³n y registra resultado financiero y calidad de ejecuciÃ³n." },
      { title: "RevisiÃ³n de 10 operaciones", content: "Una sola prÃ¡ctica no demuestra una estrategia. Agrupa resultados, tasa de acierto, ganancia media, pÃ©rdida media y errores.", practice: "Completa diez prÃ¡cticas y escribe una mejora concreta para la siguiente serie." },
    ],
  },
  {
    id: "estafas",
    number: "06",
    title: "Evitar estafas",
    summary: "Reconoce promesas falsas y protege tus cuentas y dispositivos.",
    lessons: [
      { title: "Promesas y urgencia", content: "Rentabilidad garantizada, presiÃ³n para depositar y supuestos expertos que escriben por privado son alertas frecuentes.", practice: "Marca las seÃ±ales de alarma en tres ofertas ficticias." },
      { title: "Phishing y aplicaciones falsas", content: "Verifica dominio, aplicaciÃ³n y remitente. Nunca ingreses una frase semilla desde un enlace recibido por mensaje.", practice: "Revisa una URL de ejemplo y detecta cambios de letras o dominios extraÃ±os." },
      { title: "Seguridad de cuenta", content: "Usa contraseÃ±a Ãºnica, gestor de contraseÃ±as y autenticaciÃ³n de dos factores con aplicaciÃ³n cuando sea posible.", practice: "Completa una lista de seguridad para correo, exchange y wallet." },
      { title: "QuÃ© hacer ante un incidente", content: "DetÃ©n transferencias, cambia credenciales desde un equipo seguro, revoca sesiones y documenta direcciones y transacciones para reportar.", practice: "Ordena los pasos de respuesta ante una cuenta comprometida." },
    ],
  },
];

type QuizQuestion = {
  statement: string;
  answer: boolean;
  explanation: string;
};

const lessonReadings: Record<string, string[]> = {
  fundamentos: [
    "El tÃ©rmino criptomoneda reÃºne activos digitales muy diferentes. Bitcoin fue diseÃ±ado como una red monetaria sin una autoridad central; Ether sirve ademÃ¡s para pagar operaciones en Ethereum; USDT busca seguir el valor del dÃ³lar. Una moneda pertenece a su propia red, mientras que un token suele funcionar sobre una red existente. El precio es lo que el mercado paga en un momento, la capitalizaciÃ³n aproxima precio por unidades circulantes y el volumen muestra cuÃ¡nto se negociÃ³. Ninguno de esos datos, por separado, demuestra que un proyecto sea Ãºtil, seguro o una buena compra. Antes de considerar un activo revisa su propÃ³sito, emisiÃ³n, liquidez, equipo, riesgos y dÃ³nde se negocia.",
    "Una blockchain es un registro compartido entre muchos participantes. Las transacciones vÃ¡lidas se agrupan en bloques y cada bloque contiene una referencia criptogrÃ¡fica al anterior, haciendo visible una alteraciÃ³n. En prueba de trabajo, los mineros compiten usando cÃ³mputo; en prueba de participaciÃ³n, validadores bloquean activos y siguen reglas de consenso. Las confirmaciones reducen la probabilidad de reversiÃ³n, pero no corrigen una direcciÃ³n equivocada ni garantizan recuperar fondos. Un explorador permite consultar identificador, direcciÃ³n, importe, comisiÃ³n, bloque y estado. La transparencia del registro tampoco garantiza que el token o contrato sea legÃ­timo: solo confirma lo ocurrido en esa red.",
    "Una wallet no guarda monedas como una carpeta; administra claves que permiten autorizar movimientos registrados en la red. En una plataforma custodial, la empresa controla las claves y el usuario depende de ella. En una wallet no custodial, el usuario controla la frase semilla y tambiÃ©n asume toda la responsabilidad. Las wallets calientes estÃ¡n conectadas a internet y son prÃ¡cticas; las frÃ­as mantienen las claves fuera de lÃ­nea y reducen ciertos ataques. La frase semilla debe escribirse fuera de internet, conservarse en un lugar privado y jamÃ¡s compartirse. Quien la obtiene puede mover los activos sin pedir permiso. Antes de recibir fondos, verifica red, direcciÃ³n y una transferencia pequeÃ±a de prueba.",
    "Las stablecoins intentan conservar una referencia estable, normalmente un dÃ³lar, pero no son idÃ©nticas al dinero de un banco central. Pueden depender de reservas, garantÃ­as cripto o mecanismos algorÃ­tmicos; por ello existen riesgos de emisor, congelamiento, pÃ©rdida de paridad y regulaciÃ³n. AdemÃ¡s, un mismo sÃ­mbolo como USDT circula en varias redes. La direcciÃ³n, la red de origen y la red de destino deben ser compatibles. Las comisiones y tiempos cambian entre Ethereum, Tron, BNB Chain y otras redes. Antes de enviar, confirma activo, red, direcciÃ³n completa, memo o etiqueta cuando corresponda, importe y comisiÃ³n. Una operaciÃ³n blockchain normalmente no puede cancelarse.",
  ],
  mercado: [
    "Una vela representa el comportamiento del precio durante un periodo definido. Registra apertura, mÃ¡ximo, mÃ­nimo y cierre. Si el cierre supera la apertura, el cuerpo suele mostrarse alcista; si queda debajo, bajista. Las mechas seÃ±alan precios visitados que no se mantuvieron hasta el cierre. Una mecha larga puede sugerir rechazo, pero su significado depende de la tendencia, el volumen y la zona donde aparece. Una sola vela no predice el futuro. Para interpretarla compara las velas anteriores, observa si aparece en soporte o resistencia y espera el cierre del periodo. Analizar una vela todavÃ­a abierta puede llevar a conclusiones que desaparecen segundos despuÃ©s.",
    "La temporalidad determina cuÃ¡nta informaciÃ³n resume cada vela. En 15 minutos se observan movimientos rÃ¡pidos y mucho ruido; en cuatro horas o un dÃ­a aparece una estructura mÃ¡s amplia. Un activo puede subir dentro de una correcciÃ³n de tendencia bajista, por eso conviene comenzar por el marco mayor y despuÃ©s buscar precisiÃ³n en uno menor. La temporalidad tambiÃ©n debe coincidir con el horizonte de la prÃ¡ctica: una decisiÃ³n de varios dÃ­as no deberÃ­a depender Ãºnicamente de una vela de un minuto. Cambiar de marco solo para encontrar una seÃ±al que confirme lo que deseas es un sesgo. Define antes quÃ© temporalidades utilizarÃ¡s y mantÃ©n la misma regla al evaluar resultados.",
    "La tendencia se estudia observando secuencias de mÃ¡ximos y mÃ­nimos. MÃ¡ximos y mÃ­nimos ascendentes muestran dominio comprador; descendentes, dominio vendedor. Si el precio oscila sin progresar, existe un rango y las estrategias de tendencia pierden precisiÃ³n. Una ruptura de estructura ocurre cuando se supera un punto relevante, preferentemente con cierre y participaciÃ³n. No todo movimiento contrario cambia la tendencia: puede ser un retroceso normal. Distinguir impulso y correcciÃ³n evita entrar tarde. Marca en el grÃ¡fico puntos evidentes, no cada fluctuaciÃ³n pequeÃ±a, y define quÃ© nivel invalidarÃ­a tu lectura. La estructura describe lo que el precio hizo; no promete lo que harÃ¡ despuÃ©s.",
    "Soporte y resistencia son zonas donde compradores o vendedores reaccionaron anteriormente. No deben trazarse como nÃºmeros perfectos porque el mercado suele penetrarlas antes de decidir. Una zona gana relevancia por cantidad de reacciones, temporalidad y movimiento posterior, aunque demasiadas pruebas pueden debilitarla. Cuando una resistencia se rompe puede actuar como soporte, pero el cambio requiere confirmaciÃ³n. Las falsas rupturas ocurren cuando el precio atraviesa una zona y regresa rÃ¡pidamente. Para reducir errores, espera cierre, revisa volumen y define invalidaciÃ³n. Una entrada siempre debe incluir un escenario alternativo: si el nivel no se sostiene, la idea queda descartada y no se modifica el plan para evitar aceptar la pÃ©rdida.",
  ],
  indicadores: [
    "El RSI compara la magnitud de movimientos recientes y suele expresarse entre 0 y 100. Valores altos muestran impulso comprador y valores bajos impulso vendedor, pero 70 y 30 no son botones automÃ¡ticos de venta o compra. En tendencias fuertes el RSI puede permanecer extremo durante bastante tiempo. TambiÃ©n pueden observarse divergencias, cuando precio e indicador avanzan de manera distinta, aunque una divergencia puede tardar en resolverse. Ãšsalo como confirmaciÃ³n de estructura, no como motivo Ãºnico. Pregunta primero dÃ³nde estÃ¡ el precio, quÃ© tendencia domina y quÃ© riesgo aceptarÃ­as. DespuÃ©s utiliza el RSI para evaluar si el impulso acompaÃ±a o se debilita.",
    "Una media mÃ³vil calcula el promedio de precios de una cantidad determinada de periodos. La media simple asigna el mismo peso a todos; la exponencial da mayor importancia a datos recientes. Su inclinaciÃ³n ayuda a visualizar direcciÃ³n y puede funcionar como referencia dinÃ¡mica, pero siempre reacciona despuÃ©s del precio. Los cruces entre medias son claros visualmente y, al mismo tiempo, pueden llegar cuando gran parte del movimiento ya ocurriÃ³. En rangos producen mÃºltiples seÃ±ales falsas. No existe un periodo universalmente correcto: debe mantenerse constante durante la evaluaciÃ³n. Combina medias con estructura, zonas y volumen, evitando acumular varias medias que entregan esencialmente la misma informaciÃ³n.",
    "El MACD se construye con la diferencia entre medias exponenciales, una lÃ­nea de seÃ±al y un histograma. Un cruce puede mostrar cambio de impulso; el histograma permite observar si esa diferencia aumenta o disminuye. Estar sobre cero suele acompaÃ±ar una fase positiva y estar debajo una negativa, pero no garantiza continuidad. Como deriva del precio, tambiÃ©n es retrasado y puede fallar en movimientos laterales. Una lectura Ãºtil compara direcciÃ³n del precio, posiciÃ³n respecto a una zona y comportamiento del histograma. Si estructura y volumen contradicen el cruce, la seÃ±al pierde calidad. EvalÃºa siempre varios ejemplos, incluyendo fallos, antes de incorporar el MACD a una regla de prÃ¡ctica.",
    "El volumen aproxima la participaciÃ³n detrÃ¡s de un movimiento. Una ruptura acompaÃ±ada por aumento de volumen suele tener mÃ¡s interÃ©s que otra con actividad dÃ©bil, aunque el volumen disponible puede variar segÃºn plataforma y mercado. La confluencia aparece cuando elementos diferentes apoyan una misma hipÃ³tesis: por ejemplo, tendencia, soporte, vela de confirmaciÃ³n y volumen. Usar RSI, MACD y varias medias no siempre es verdadera confluencia porque todos provienen del precio. Selecciona evidencias que midan aspectos distintos y evita exigir tantas condiciones que nunca puedas actuar. Antes de practicar, escribe quÃ© seÃ±ales deben cumplirse, dÃ³nde queda invalidada la idea y cuÃ¡l serÃ¡ el riesgo mÃ¡ximo.",
  ],
  riesgo: [
    "La primera decisiÃ³n no es cuÃ¡nto ganar, sino cuÃ¡nto estÃ¡s dispuesto a perder si la hipÃ³tesis falla. El riesgo por operaciÃ³n debe ser una porciÃ³n pequeÃ±a y previamente definida del capital virtual. Arriesgar una cantidad constante permite sobrevivir a una serie de pÃ©rdidas y comparar prÃ¡cticas. El tamaÃ±o de posiciÃ³n depende de la distancia entre entrada y stop: cuanto mÃ¡s lejano sea el stop, menor debe ser la posiciÃ³n para conservar el mismo riesgo. Concentrar todo en una moneda aumenta la exposiciÃ³n a un solo evento. Diversificar tampoco significa comprar muchos activos correlacionados. En CriptoPulso usa el lÃ­mite de pÃ©rdida antes de operar y nunca aumentes el riesgo para recuperar rÃ¡pidamente.",
    "El stop loss es el punto donde la razÃ³n tÃ©cnica de la operaciÃ³n deja de ser vÃ¡lida. No se coloca al azar ni se aleja despuÃ©s de entrar para evitar una pÃ©rdida. Primero se identifica la invalidaciÃ³n; despuÃ©s se calcula el tamaÃ±o que mantiene la pÃ©rdida mÃ¡xima aceptada. Un stop demasiado cercano puede activarse por ruido normal, mientras uno lejano exige una posiciÃ³n menor. TambiÃ©n existen deslizamiento y movimientos bruscos, por lo que un stop no garantiza ejecuciÃ³n exacta en mercados reales. En la prÃ¡ctica virtual registra entrada, stop, objetivo y tamaÃ±o antes de comprar. Si no puedes explicar por quÃ© el nivel invalida tu lectura, aÃºn no existe un plan completo.",
    "La relaciÃ³n riesgo/beneficio compara la pÃ©rdida prevista con la ganancia objetivo. Si arriesgas 10 para buscar 20, la relaciÃ³n es 1 a 2. Esto no significa que ganarÃ¡s dos veces lo arriesgado: el precio puede alcanzar el stop y la probabilidad importa. Una estrategia con menor tasa de acierto puede ser viable si sus ganancias medias superan claramente sus pÃ©rdidas, mientras una alta tasa de acierto puede ocultar pÃ©rdidas ocasionales enormes. El objetivo debe basarse en estructura y zonas posibles, no en el nÃºmero que deseas ganar. Antes de entrar calcula ambos escenarios y descarta operaciones cuyo beneficio potencial no compense el riesgo y la incertidumbre.",
    "El diario convierte experiencias aisladas en informaciÃ³n. Registra fecha, activo, temporalidad, hipÃ³tesis, captura, entrada, stop, objetivo, tamaÃ±o, emociÃ³n, salida y resultado. AÃ±ade si respetaste las reglas, porque una operaciÃ³n ganadora ejecutada impulsivamente sigue siendo un error de proceso. Revisa grupos de al menos diez prÃ¡cticas para identificar tasa de acierto, ganancia media, pÃ©rdida media y fallos repetidos. DespuÃ©s modifica una sola regla y vuelve a probarla; cambiar todo impide saber quÃ© mejorÃ³. La disciplina incluye dejar de operar cuando alcanzas el lÃ­mite diario, no perseguir pÃ©rdidas y aceptar que quedarse fuera tambiÃ©n es una decisiÃ³n vÃ¡lida.",
  ],
  simulacion: [
    "Una hipÃ³tesis de operaciÃ³n debe ser especÃ­fica y falsable. Incluye activo, direcciÃ³n, temporalidad, estructura observada, confirmaciones, entrada, invalidaciÃ³n y objetivo. Decir â€œcreo que subirÃ¡â€ no permite evaluar nada; decir â€œsi cierra sobre resistencia con volumen, practicarÃ© una compra y saldrÃ© si vuelve bajo la zonaâ€ sÃ­ establece condiciones. La hipÃ³tesis se escribe antes de ver el resultado para evitar justificar despuÃ©s cualquier movimiento. TambiÃ©n debe contemplar no operar si falta una condiciÃ³n. Usa las seÃ±ales de CriptoPulso como punto de anÃ¡lisis, no como orden automÃ¡tica, y contrÃ¡stalas con el grÃ¡fico y tu lÃ­mite de riesgo.",
    "Ejecutar significa seguir las condiciones planificadas. Si el precio se aleja de la entrada, no se persigue por miedo a perder la oportunidad; se espera otra configuraciÃ³n. DespuÃ©s de abrir, no se amplÃ­a el stop ni se aumenta la posiciÃ³n sin una regla previamente probada. El tamaÃ±o y el lÃ­mite de pÃ©rdida deben configurarse antes de pulsar comprar. Las emociones mÃ¡s comunes son miedo, euforia, impaciencia y deseo de recuperar; anÃ³talas sin juzgarte. El objetivo de la simulaciÃ³n no es producir una cifra espectacular, sino aprender un proceso repetible. Una operaciÃ³n omitida por no cumplir condiciones demuestra disciplina, no fracaso.",
    "Al cerrar una posiciÃ³n se mide resultado y calidad de ejecuciÃ³n. Ganar no convierte automÃ¡ticamente la decisiÃ³n en buena, porque una entrada sin plan puede beneficiarse del azar. Del mismo modo, una pÃ©rdida controlada puede ser una operaciÃ³n correctamente ejecutada. Compara precio de entrada y salida, comisiones hipotÃ©ticas, duraciÃ³n y riesgo asumido. Clasifica la prÃ¡ctica: plan respetado, error de anÃ¡lisis o error de ejecuciÃ³n. Luego escribe una observaciÃ³n concreta, como esperar el cierre de vela o reducir tamaÃ±o. Evita modificar inmediatamente la estrategia por una sola pÃ©rdida. El aprendizaje surge de revisar patrones repetidos con criterios iguales.",
    "Una serie de diez operaciones permite calcular mÃ©tricas bÃ¡sicas. La tasa de acierto es ganadoras dividido entre total; la ganancia media y pÃ©rdida media muestran la magnitud tÃ­pica; la expectativa combina frecuencia y tamaÃ±o de resultados. TambiÃ©n registra la caÃ­da mÃ¡xima del capital y cuÃ¡ntas reglas incumpliste. Diez prÃ¡cticas siguen siendo una muestra pequeÃ±a, pero son mejores que juzgar por un caso. Separa resultados por moneda y temporalidad para no mezclar contextos diferentes. Al terminar, conserva lo que funcionÃ³, selecciona un solo ajuste y prueba otra serie. El dinero virtual permite repetir este ciclo sin arriesgar patrimonio real.",
  ],
  estafas: [
    "Las estafas suelen combinar una promesa atractiva con urgencia y autoridad aparente. Rentabilidad fija, cero riesgo, bonos por depositar hoy, capturas de ganancias y supuestos asesores que escriben en privado son seÃ±ales de alerta. Un logotipo conocido o muchos seguidores no prueban legitimidad. Investiga dominio, antigÃ¼edad, responsables, condiciones de retiro y advertencias independientes. Nunca envÃ­es dinero para â€œliberarâ€ una ganancia ni aceptes instalar programas de acceso remoto. Las recomendaciones de CriptoPulso son educativas y no solicitan entregar fondos para invertir en tu nombre. Si una oferta impide hacer preguntas o verificar informaciÃ³n, alÃ©jate.",
    "El phishing imita pÃ¡ginas, correos y aplicaciones para robar credenciales. Una letra cambiada, subdominio engaÃ±oso o enlace acortado puede dirigir a un sitio falso idÃ©ntico al original. Accede escribiendo la direcciÃ³n o usando un marcador verificado; revisa el dominio completo antes de iniciar sesiÃ³n. Las tiendas de aplicaciones tambiÃ©n pueden contener copias, por lo que debes confirmar desarrollador y sitio oficial. NingÃºn soporte legÃ­timo necesita tu frase semilla. Tampoco la escribas en formularios, enlaces, chats o supuestas herramientas de recuperaciÃ³n. Ante un mensaje urgente, detente y verifica mediante un canal distinto antes de realizar cualquier acciÃ³n.",
    "La seguridad depende de varias capas. Utiliza una contraseÃ±a larga y Ãºnica para correo, plataforma y exchange; un gestor evita reutilizarlas. Activa autenticaciÃ³n de dos factores con aplicaciÃ³n o llave fÃ­sica cuando estÃ© disponible, conserva cÃ³digos de recuperaciÃ³n fuera de lÃ­nea y protege especialmente el correo porque permite restablecer otras cuentas. MantÃ©n sistema y navegador actualizados, bloquea el dispositivo y evita operar desde redes o equipos desconocidos. Revisa sesiones activas, direcciones autorizadas y notificaciones. Para montos relevantes, separa una wallet de uso frecuente de otra de resguardo. Ninguna medida elimina todo riesgo, pero varias capas reducen la posibilidad de una pÃ©rdida total.",
    "Si sospechas un incidente, actÃºa con orden. Desde un dispositivo seguro cambia primero la contraseÃ±a del correo y luego las cuentas vinculadas; revoca sesiones, claves API y aplicaciones desconocidas. Si la frase semilla pudo filtrarse, crea una wallet segura y mueve los fondos restantes sin volver a utilizar la comprometida. Contacta a la plataforma desde su sitio oficial y documenta horarios, direcciones, identificadores de transacciÃ³n, mensajes y capturas para reportar. No pagues a personas que prometen recuperar fondos garantizadamente: existe una segunda estafa dirigida a vÃ­ctimas. DespuÃ©s revisa cÃ³mo ocurriÃ³ el acceso y corrige la causa antes de volver a operar.",
  ],
};

const moduleQuizzes: Record<string, QuizQuestion[]> = {
  fundamentos: [
    { statement: "Una capitalizaciÃ³n alta garantiza que una criptomoneda sea segura.", answer: false, explanation: "La capitalizaciÃ³n describe tamaÃ±o aproximado, no seguridad ni calidad." },
    { statement: "Una blockchain permite consultar transacciones mediante exploradores.", answer: true, explanation: "Los exploradores muestran datos pÃºblicos de la red y sus confirmaciones." },
    { statement: "Quien obtiene tu frase semilla puede controlar los activos de esa wallet.", answer: true, explanation: "La frase permite reconstruir las claves; nunca debe compartirse." },
    { statement: "Para enviar USDT basta con que el sÃ­mbolo sea igual, sin revisar la red.", answer: false, explanation: "Origen y destino deben utilizar una red compatible." },
  ],
  mercado: [
    { statement: "Una vela todavÃ­a abierta puede cambiar antes de cerrar.", answer: true, explanation: "MÃ¡ximo, mÃ­nimo y cierre continÃºan variando durante el periodo." },
    { statement: "La tendencia debe analizarse en una sola temporalidad elegida despuÃ©s de entrar.", answer: false, explanation: "Las temporalidades se definen antes y se inicia por el contexto mayor." },
    { statement: "MÃ¡ximos y mÃ­nimos ascendentes suelen describir una estructura alcista.", answer: true, explanation: "Esa secuencia refleja progreso comprador mientras no sea invalidada." },
    { statement: "Soporte y resistencia son precios exactos que nunca se atraviesan.", answer: false, explanation: "Son zonas y pueden existir penetraciones o falsas rupturas." },
  ],
  indicadores: [
    { statement: "Un RSI sobre 70 obliga a vender inmediatamente.", answer: false, explanation: "Mide impulso y puede permanecer extremo en tendencias fuertes." },
    { statement: "Las medias mÃ³viles reaccionan despuÃ©s del precio.", answer: true, explanation: "Se calculan con precios anteriores y, por ello, son retrasadas." },
    { statement: "El MACD debe combinarse con estructura y volumen.", answer: true, explanation: "Un cruce aislado puede producir seÃ±ales falsas." },
    { statement: "Usar muchos indicadores derivados del precio siempre crea confluencia independiente.", answer: false, explanation: "Pueden repetir la misma informaciÃ³n bajo fÃ³rmulas distintas." },
  ],
  riesgo: [
    { statement: "El tamaÃ±o de posiciÃ³n debe ajustarse a la distancia del stop.", answer: true, explanation: "AsÃ­ se mantiene constante la pÃ©rdida mÃ¡xima prevista." },
    { statement: "Conviene alejar el stop despuÃ©s de entrar para no aceptar una pÃ©rdida.", answer: false, explanation: "Eso aumenta el riesgo y rompe la invalidaciÃ³n planificada." },
    { statement: "Una relaciÃ³n 1 a 2 garantiza que la operaciÃ³n serÃ¡ ganadora.", answer: false, explanation: "Solo compara pÃ©rdida y beneficio posibles; no asegura probabilidad." },
    { statement: "Una operaciÃ³n ganadora puede estar mal ejecutada si incumpliÃ³ el plan.", answer: true, explanation: "El proceso debe evaluarse ademÃ¡s del resultado." },
  ],
  simulacion: [
    { statement: "Una hipÃ³tesis Ãºtil debe incluir cuÃ¡ndo queda invalidada.", answer: true, explanation: "Debe poder demostrarse equivocada y limitar el riesgo." },
    { statement: "Si el precio se aleja, es correcto perseguirlo para no perder la oportunidad.", answer: false, explanation: "Se espera otra configuraciÃ³n si ya no se cumple la entrada." },
    { statement: "Una pÃ©rdida controlada puede provenir de una buena decisiÃ³n.", answer: true, explanation: "El mercado es incierto; importa respetar un proceso sÃ³lido." },
    { statement: "Una sola operaciÃ³n basta para demostrar que una estrategia funciona.", answer: false, explanation: "Se necesitan series comparables y mÃ©tricas repetidas." },
  ],
  estafas: [
    { statement: "La rentabilidad garantizada y sin riesgo es una seÃ±al de alerta.", answer: true, explanation: "Ninguna inversiÃ³n legÃ­tima elimina el riesgo." },
    { statement: "El soporte tÃ©cnico puede solicitar tu frase semilla para verificar la cuenta.", answer: false, explanation: "La frase semilla nunca debe entregarse a ninguna persona." },
    { statement: "Una contraseÃ±a Ãºnica y autenticaciÃ³n de dos factores mejoran la protecciÃ³n.", answer: true, explanation: "Son capas diferentes que reducen accesos no autorizados." },
    { statement: "DespuÃ©s de un robo conviene pagar a quien garantice recuperar los fondos.", answer: false, explanation: "Las falsas recuperaciones son una estafa frecuente contra vÃ­ctimas." },
  ],
};

const fallback: Coin[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    price: 118420,
    change: 2.84,
    cap: "$2.35T",
    volume: "$48.2B",
    signal: "COMPRA",
    confidence: 78,
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    price: 4286,
    change: 1.37,
    cap: "$517B",
    volume: "$21.8B",
    signal: "COMPRA",
    confidence: 71,
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    price: 208.4,
    change: -0.82,
    cap: "$102B",
    volume: "$6.7B",
    signal: "ESPERAR",
    confidence: 64,
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    price: 782.1,
    change: 3.12,
    cap: "$109B",
    volume: "$2.1B",
    signal: "COMPRA FUERTE",
    confidence: 84,
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    price: 3.18,
    change: -2.14,
    cap: "$188B",
    volume: "$5.4B",
    signal: "VENTA",
    confidence: 69,
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    price: 0.91,
    change: 0.48,
    cap: "$32B",
    volume: "$980M",
    signal: "ESPERAR",
    confidence: 58,
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    price: 0.23,
    change: 1.1,
    cap: "$34B",
    volume: "$2.1B",
    signal: "COMPRA",
    confidence: 66,
  },
  {
    id: "tron",
    symbol: "TRX",
    name: "TRON",
    price: 0.34,
    change: 0.3,
    cap: "$32B",
    volume: "$950M",
    signal: "ESPERAR",
    confidence: 59,
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    price: 22.4,
    change: 1.8,
    cap: "$15B",
    volume: "$820M",
    signal: "COMPRA",
    confidence: 70,
  },
  {
    id: "avalanche-2",
    symbol: "AVAX",
    name: "Avalanche",
    price: 31.8,
    change: -0.7,
    cap: "$13B",
    volume: "$510M",
    signal: "VENTA",
    confidence: 61,
  },
  {
    id: "stellar",
    symbol: "XLM",
    name: "Stellar",
    price: 0.41,
    change: 0.6,
    cap: "$12B",
    volume: "$390M",
    signal: "COMPRA",
    confidence: 62,
  },
  {
    id: "sui",
    symbol: "SUI",
    name: "Sui",
    price: 3.72,
    change: 2.4,
    cap: "$12B",
    volume: "$1.2B",
    signal: "COMPRA",
    confidence: 74,
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    price: 5.1,
    change: -1.2,
    cap: "$8B",
    volume: "$310M",
    signal: "VENTA",
    confidence: 65,
  },
  {
    id: "litecoin",
    symbol: "LTC",
    name: "Litecoin",
    price: 118,
    change: 0.4,
    cap: "$9B",
    volume: "$640M",
    signal: "ESPERAR",
    confidence: 59,
  },
  {
    id: "uniswap",
    symbol: "UNI",
    name: "Uniswap",
    price: 10.2,
    change: 1.6,
    cap: "$6B",
    volume: "$280M",
    signal: "COMPRA",
    confidence: 68,
  },
  {
    id: "pepe",
    symbol: "PEPE",
    name: "Pepe",
    price: 0.000012,
    change: -2.2,
    cap: "$5B",
    volume: "$900M",
    signal: "VENTA",
    confidence: 72,
  },
];

const fmt = (n: number) =>
  n >= 1000
    ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 2 })}`;
const dollarY = (value: number) => 285 - ((value - 6) / 8) * 240;
const compact = (n: number) =>
  n >= 1e12
    ? `$${(n / 1e12).toFixed(2)}T`
    : n >= 1e9
      ? `$${(n / 1e9).toFixed(1)}B`
      : `$${(n / 1e6).toFixed(0)}M`;

type Candle = { open: number; close: number; high: number; low: number };
const seedCandles = (coin: Coin, range: string) => {
  let value =
    coin.price *
    (range === "1H"
      ? 0.985
      : range === "4H"
        ? 0.95
        : range === "1D"
          ? 0.91
          : 0.78);
  return Array.from({ length: 42 }, (_, i) => {
    const wave =
      Math.sin(i * 0.83) * 0.012 +
      Math.cos(i * 0.31) * 0.007 +
      coin.change / 100 / 42;
    const open = value;
    const close = open * (1 + wave);
    const high = Math.max(open, close) * (1 + 0.005 + (i % 4) * 0.002);
    const low = Math.min(open, close) * (1 - 0.004 - (i % 3) * 0.002);
    value = close;
    return { open, close, high, low };
  });
};

function CandleChart({
  coin,
  range,
  seconds,
  onPrice,
}: {
  coin: Coin;
  range: string;
  seconds: number;
  onPrice?: (price: number) => void;
}) {
  const [data, setData] = useState<Candle[]>(() => seedCandles(coin, range));
  const [progress, setProgress] = useState(0);
  const openedAt = useRef(Date.now());
  useEffect(() => {
    setData(seedCandles(coin, range));
    openedAt.current = Date.now();
    setProgress(0);
    onPrice?.(coin.price);
  }, [coin.id, coin.price, range]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setData((old) => {
        const rows = [...old],
          last = { ...rows[rows.length - 1] };
        const drift = (Math.random() - 0.485) * last.close * 0.0018;
        last.close = Math.max(0.000001, last.close + drift);
        last.high = Math.max(last.high, last.close);
        last.low = Math.min(last.low, last.close);
        rows[rows.length - 1] = last;
        const elapsed = Date.now() - openedAt.current;
        setProgress(Math.min(100, elapsed / (seconds * 10)));
        if (elapsed >= seconds * 1000) {
          const nextOpen = last.close;
          rows.push({
            open: nextOpen,
            close: nextOpen,
            high: nextOpen,
            low: nextOpen,
          });
          rows.shift();
          openedAt.current = Date.now();
          setProgress(0);
        }
        onPrice?.(last.close);
        return rows;
      });
    }, 650);
    return () => window.clearInterval(timer);
  }, [seconds, onPrice]);
  const min = Math.min(...data.map((d) => d.low)),
    max = Math.max(...data.map((d) => d.high));
  const y = (v: number) =>
    20 + ((max - v) / Math.max(0.000001, max - min)) * 270;
  return (
    <div className="animated-chart">
      <div className="candle-timer">
        <span>VELA EN FORMACIÃ“N</span>
        <i>
          <u style={{ width: `${progress}%` }} />
        </i>
        <b>{Math.max(0, Math.ceil(seconds * (1 - progress / 100)))}s</b>
      </div>
      <svg
        className="candle-chart"
        viewBox="0 0 820 320"
        preserveAspectRatio="none"
        aria-label={`GrÃ¡fico dinÃ¡mico de velas de ${coin.name}`}
      >
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#17d8a1" stopOpacity=".2" />
            <stop offset="1" stopColor="#17d8a1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((i) => (
          <line
            key={i}
            x1="0"
            x2="820"
            y1={20 + i * 68}
            y2={20 + i * 68}
            className="grid-line"
          />
        ))}
        {data.map((d, i) => {
          const x = 10 + i * 19.2,
            up = d.close >= d.open,
            c = up ? "#19d6a0" : "#f05b6b";
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(d.high)} y2={y(d.low)} stroke={c} />
              <rect
                x={x - 4.5}
                y={Math.min(y(d.open), y(d.close))}
                width="9"
                height={Math.max(2, Math.abs(y(d.open) - y(d.close)))}
                fill={c}
                rx="1"
              />
            </g>
          );
        })}
        <line
          x1="0"
          x2="820"
          y1={y(data.at(-1)!.close)}
          y2={y(data.at(-1)!.close)}
          className="current-line"
        />
        <text x="755" y={y(data.at(-1)!.close) - 7} className="price-label">
          {fmt(data.at(-1)!.close)}
        </text>
      </svg>
    </div>
  );
}

export default function Home() {
  const supabase = useRef(createClient()).current;
  const [view, setView] = useState<
    | "market"
    | "simulator"
    | "dollar"
    | "fuel"
    | "basket"
    | "community"
    | "academy"
    | "plans"
    | "payment"
    | "login"
    | "admin"
  >("market");
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasPaidAccess, setHasPaidAccess] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [coins, setCoins] = useState(fallback);
  const [selected, setSelected] = useState("bitcoin");
  const [range, setRange] = useState("1D");
  const [candleSeconds, setCandleSeconds] = useState(30);
  const [livePrice, setLivePrice] = useState(fallback[0].price);
  const [blue, setBlue] = useState({
    buy: 11.14,
    sell: 11.18,
    official: 11.86,
    updated: "Referencia P2P reciente",
  });
  const [cash, setCash] = useState(10000);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [amount, setAmount] = u×¿xîÚ$z{-®éÜj×#U4EB ¢Ğ¢óà¢ÂöÆ&VÃà¢ÆÆ&VÃà¢–×÷'FRW†7FòvFò’ÖöæVF¢Æ–çW@¢æÖSÒ'–DÖ÷VçB ¢&WV—&V@¢Ö„ÆVæwFƒ×³CĞ¢Æ6V†öÆFW#Ò$V¢ã¢'2ÃƒbòU4EB ¢óà¢ÂöÆ&VÃà¢ÆÆ&VÃà¢ì;¦ÖW&òò&VfW&Væ6–FVÂvò†÷6–öæÂ¢Æ–çWBæÖSÒ'&VfW&Væ6R"Ö„ÆVæwFƒ×³#Òóà¢ÂöÆ&VÃà¢ÆÆ&VÃà¢6ö×&ö&çFR¥rÂärÂtT%òD`¢Æ–çW@¢æÖSÒ'&V6V—B ¢G—SÒ&f–ÆR ¢66WCÒ&–ÖvRö§VrÆ–ÖvR÷ærÆ–ÖvR÷vV'ÆÆ–6F–öâ÷Fb ¢&WV—&V@¢óà¢Ç6ÖÆÃäÆ2f÷F÷2w&æFW26R÷F–Ö—¦âçFW2FRVçf–'6RâÜ:†–ÖòRÔ"ãÂ÷6ÖÆÃà¢ÂöÆ&VÃà¢·&WVW7E7FGW2bb€¢ÆF—b6Æ74æÖSÒ'ÆâÖæ÷F–6R#ç·&WVW7E7FGW7ÓÂöF—cà¢—Ğ¢Æ'WGFöâ6Æ74æÖSÒ'&7F–6R#äVçf–"&fW&–f–66œ;6ãÂö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖSÒ&WF‚ÖÆöv÷WB ¢öä6Æ–6³×²‚’Óâ6WEf–Wr‚'Æç2"—Ğ¢à¢föÇfW"ÆæW0¢Âö'WGFöãà¢Âöf÷&Óà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&FöÆÆ""bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vRFöÆÆ"×vR#à¢ÆF—b6Æ74æÖSÒ'vR×F—FÆR#à¢Ç7ãäô%4U%dDõ$”òU4Bò$ô#Â÷7ãà¢ÆƒäVçF–VæFRÆWföÇV6œ;6âFVÂL;6Æ"Vâ&öÆ—f–ãÂöƒà¢Çà¢6ö×&&VfW&Væ6–26–â6öægVæF—"VÂF—òöf–6–ÂÂVÂ%F–v—FÀ¢’VÂVfV7F—fòà¢Â÷à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&FöÆÆ"×7VÖÖ'’#à¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃå$TdU$Tä4”$4"Ôõ5E$DÂ÷6ÖÆÃà¢Æ#ä'2¶&ÇVRæöff–6–ÂçFôf—†VBƒ"—ÓÂö#à¢Ç7ãåU4Bò$ô#Â÷7ãà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃå%D”t•DÂ+r4ôÕ$Â÷6ÖÆÃà¢Æ#ä'2¶&ÇVRæ'W’çFôf—†VBƒ"—ÓÂö#à¢Ç7ãåU4EBò$ô#Â÷7ãà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃå%D”t•DÂ+rdTåDÂ÷6ÖÆÃà¢Æ#ä'2¶&ÇVRç6VÆÂçFôf—†VBƒ"—ÓÂö#à¢Ç7ãç¶&ÇVRçWFFVGÓÂ÷7ãà¢Âö'F–6ÆSà¢ÂöF—cà¢Æ'F–6ÆR6Æ74æÖSÒ&FöÆÆ"Ö†—7F÷'’æVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂ×F÷#à¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#åDTäDTä4”„•5L95$”4ÂöF—cà¢Æƒ3ä6ö×&6œ;6âÖVç7VÂU4Bô$ô#Âöƒ3à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&6†'BÖÆVvVæB#à¢Ç7â6Æ74æÖSÒ&öff–6–ÂÖÆ–æR#î)xò$4#Â÷7ãà¢Ç7â6Æ74æÖSÒ''ÖÆ–æR#î)xò%F–v—FÃÂ÷7ãà¢ÂöF—cà¢ÂöF—cà¢Ç7fp¢f–Wt&÷ƒÒ#“#33 ¢&W6W'fT7V7E&F–óÒ'„Ö–E”Ö–BÖVWB ¢&–ÖÆ&VÃÒ$w,:f–6ò†—7L;7&–6òFVÖ÷7G&F—fòFVÂL;6Æ"Vâ&öÆ—f– ¢à¢µ³BÂ"ÂÂ‚ÂeÒæÖ‚‡fÇVR’Óâ€¢Ær¶W“×·fÇVWÓà¢ÆÆ–æP¢ƒÒ#SR ¢ƒ#Ò#“R ¢“×¶FöÆÆ%’‡fÇVR—Ğ¢“#×¶FöÆÆ%’‡fÇVR—Ğ¢6Æ74æÖSÒ&w&–BÖÆ–æR ¢óà¢ÇFW‡BƒÒ#Cb"“×¶FöÆÆ%’‡fÇVR’²GÒ6Æ74æÖSÒ&†—2ÖÆ&VÂ#à¢'2·fÇVWĞ¢Â÷FW‡Cà¢Âösà¢’—Ğ¢ÇöÇ–Æ–æP¢ö–çG3×¶FöÆÆ$†—7F÷'¢æÖ‚†BÂ’’ÓâG³cR²’¢sWÒÂG¶FöÆÆ%’†Bæöff–6–Â—Ö¢æ¦ö–â‚""—Ğ¢6Æ74æÖSÒ&†—7F÷'’Ööff–6–Â ¢óà¢ÇöÇ–Æ–æP¢ö–çG3×¶FöÆÆ$†—7F÷'¢æÖ‚†BÂ’’ÓâG³cR²’¢sWÒÂG¶FöÆÆ%’†Bç'—Ö¢æ¦ö–â‚""—Ğ¢6Æ74æÖSÒ&†—7F÷'’×' ¢óà¢¶FöÆÆ$†—7F÷'’æÖ‚†BÂ’’Óâ€¢Ær¶W“×¶Bæ×Óà¢Æ6—&6ÆP¢7ƒ×³cR²’¢sWĞ¢7“×¶FöÆÆ%’†Bæöff–6–Â—Ğ¢#Ò#2ãR ¢6Æ74æÖSÒ&öff–6–ÂÖF÷B ¢óà¢Æ6—&6ÆP¢7ƒ×³cR²’¢sWĞ¢7“×¶FöÆÆ%’†Bç'—Ğ¢#Ò#B ¢6Æ74æÖSÒ''ÖF÷B ¢óà¢ÇFW‡@¢ƒ×³cR²’¢sWĞ¢“×¶FöÆÆ%’†Bç'’Ò—Ğ¢6Æ74æÖSÒ'ö–çB×fÇVR'×fÇVR ¢à¢¶Bç'çFôf—†VBƒ"—Ğ¢Â÷FW‡Cà¢ÇFW‡@¢ƒ×³cR²’¢sWĞ¢“×¶FöÆÆ%’†Bæöff–6–Â’²GĞ¢6Æ74æÖSÒ'ö–çB×fÇVRöff–6–Â×fÇVR ¢à¢¶Bæöff–6–ÂçFôf—†VBƒ"—Ğ¢Â÷FW‡Cà¢ÇFW‡Bƒ×³cR²’¢sWÒ“Ò#3‚"6Æ74æÖSÒ&ÖöçF‚ÖÆ&VÂ#à¢¶Bæ×Ğ¢Â÷FW‡Cà¢Âösà¢’—Ğ¢Â÷7fsà¢ÆF—b6Æ74æÖSÒ&FFÖÖWF†öB#à¢Æ#ä–×÷'FçFR6ö'&RÆ÷2FF÷3Âö#à¢Çà¢Æ6W&–RÖVç7VÂÖ÷7G&FW2FVÖ÷7G&F—f&fÆ–F"VÀ¢F—6\;òâçFW2FVÂÆç¦Ö–VçFò6öÖW&6–Â6öæV7F&VÖ÷2¢VF—F&VÖ÷2VægVVçFR†—7L;7&–6fW&–f–6&ÆRâÆ÷2fÆ÷&W0¢7GVÆW26R&W6VçFâ6W&F÷2÷"gVVçFR’ÖW&6Fòà¢Â÷à¢ÂöF—cà¢Âö'F–6ÆSà¢ÆF—b6Æ74æÖSÒ&FöÆÆ"Ö–ç6–v‡G2#à¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä<94ÔòÄTU$ÄóÂöF—cà¢Æƒ3ì+õ÷"\:’W†—7FVâF–fW&Væ6–3óÂöƒ3à¢Çà¢VÂF—òöf–6–ÂW2Væ&VfW&Væ6––ç7F—GV6–öæÂâVÂ%&VfÆV¦¢÷W&6–öæW2F–v—FÆW2VçG&RW'6öæ2’VVFR6Ö&–"÷ ¢Æ—V–FW¢ÂÜ:—FöFòFRvò’ÆFf÷&ÖâVÂVfV7F—fòVVFRFVæW ¢÷G&6÷F—¦6œ;6âà¢Â÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä4ôÕTä”DCÂöF—cà¢Æƒ3ì+õ\:’ö'6W'fâ÷G&÷2W7V&–÷3óÂöƒ3à¢Çà¢6öÖVçFÆFVæFVæ6–U4Bô$ô"ÂW‡Æ–6GR&¦öæÖ–VçFò’&V6–&P¢fÆ÷&6–öæW2÷"÷'FW2VR—VF&öâ÷G&÷2à¢Â÷à¢Æ'WGFöâ6Æ74æÖSÒ'&7F–6R"öä6Æ–6³×²‚’Óâ6WEf–Wr‚&6öÖ×Væ—G’"—Óà¢fW"6öÖVçF&–÷2FVÂL;6Æ"(i ¢Âö'WGFöãà¢Âö'F–6ÆSà¢ÂöF—cà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&&6¶WB"bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vR&6¶WB×vR#à¢Æ†VFW"6Æ74æÖSÒ&&6¶WBÖ†W&ò#à¢ÆF—cãÇ7â6Æ74æÖSÒ&Æ—fRÖF÷B#î)xò$T4”õ2$DT4•4”ôäU2dÔ”Ä”$U3Â÷7ããÆƒì+ôL;6æFR7VW7FÖVæ÷2Æ“çGR6æ7FóÂö“ãÂöƒãÇäW‡Æ÷&&öÆ—f–Â6ö×&&VfW&Væ6–2’—VF÷G&2fÖ–Æ–2&W÷'FæFò&V6–÷2&VÆW2ãÂ÷ãÂöF—cà¢ÆF—b6Æ74æÖSÒ&&6¶WB×F÷FÂ#ãÇ6ÖÆÃå$ôET5Dõ2ô%4U%dDõ3Â÷6ÖÆÃãÆ#ç¶&6¶WE&öGV7G2æÆVæwF‡ÓÂö#ãÇ7ãå&VfW&Væ6–2öf–6–ÆW2’6ö×Væ—F&–2fW&–f–6F3Â÷7ããÂöF—cà¢Âö†VFW#à¢ÆF—b6Æ74æÖSÒ&&6¶WBÖÆ—fR×F–6¶W""&–ÖÆ&VÃÒ,9¦ÇF–Ö÷2&V6–÷2&VfW&Væ6–ÆW2#ãÆF—cçµ²ââæF—7Æ”&6¶WE&W÷'G2ÂââæF—7Æ”&6¶WE&W÷'G5Òç6Æ–6RƒÂ#’æÖ‚‡&W÷'BÂ–æFW‚’ÓâÇ7â¶W“×¶G·&W÷'Bæ–GÒÒG¶–æFW‡ÖÓãÆ#ç·&W÷'Bç&öGV7GÓÂö#â+r·&W÷'BæFW'FÖVçGÒÆ“ä'2´çVÖ&W"‡&W÷'Bç&–6R’çFôf—†VBƒ"—Ò÷·&W÷'BçVæ—GÓÂö“ãÂ÷7ãâ—ÓÂöF—cãÂöF—cà¢Æ'F–6ÆR6Æ74æÖSÒ&&6¶WBÖ6öçG&öÇ2æVÂ#à¢ÆÆ&VÃåU$”ôDóÇ6VÆV7BfÇVS×¶&6¶WEW&–öGÒöä6†ævS×²†WfVçB’Óâ6WD&6¶WEW&–öB†WfVçBçF&vWBçfÇVR—ÓãÆ÷F–öâfÇVSÒ#r#ãrL:Ö3Âö÷F–öããÆ÷F–öâfÇVSÒ#3#ã3L:Ö3Âö÷F–öããÆ÷F–öâfÇVSÒ#“#ã“L:Ö3Âö÷F–öããÆ÷F–öâfÇVSÒ&ÆÂ#åFöFòVÂ†—7L;7&–6óÂö÷F–öããÂ÷6VÆV7CãÂöÆ&VÃà¢ÆÆ&VÃä%U44"ÔU$4DóÆ–çWBfÇVS×¶&6¶WDÖ&¶WDf–ÇFW'Òöä6†ævS×²†WfVçB’Óâ6WD&6¶WDÖ&¶WDf–ÇFW"†WfVçBçF&vWBçfÇVR—ÒÆ6V†öÆFW#Ò$V¢â&öG,:ÖwVW¢Â†—W&Ö†(
b"óãÂöÆ&VÃà¢ÆF—cãÇ6ÖÆÃåTä”DB4ôÕ$$ÄSÂ÷6ÖÆÃãÆ#ç¶&6¶WEVæ—GÓÂö#ãÂöF—cà¢ÆF—cãÇ6ÖÆÃä5ETÄ•¤4œ94ãÂ÷6ÖÆÃãÆ#äWFöÜ:F–6+rc3Âö#ãÂöF—cà¢Âö'F–6ÆSà¢ÆF—b6Æ74æÖSÒ&&6¶WBÖÆ–÷WB#à¢Æ'F–6ÆR6Æ74æÖSÒ&&öÆ—f–ÖÖÖ6&BæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äÔ”åDU$5D•dòDR$ôÄ•d”ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&öÆ—f–ÖÖ×6†VÆÂ#à¢Ä&öÆ—f–FW'FÖVçDÖ6VÆV7FVC×·6VÆV7FVDFW'FÖVçGÒ&W÷'G3×¶F—7Æ”&6¶WE&W÷'G7Òöå6VÆV7C×·6WE6VÆV7FVDFW'FÖVçGÒóà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&Ö×6VÆV7F–öâ×7VÖÖ'’#ãÇ7ãäFW'FÖVçFò6VÆV66–öæFóÂ÷7ããÆ#ç·6VÆV7FVDFW'FÖVçGÓÂö#ãÇ6ÖÆÃç¶F—7Æ”&6¶WE&W÷'G2æf–ÇFW"‚‡&W÷'B’Óâ&W÷'BæFW'FÖVçBÓÓÒ6VÆV7FVDFW'FÖVçB’æÆVæwF‡Ò&VfW&Væ6–2’÷'FW2F—7öæ–&ÆW3Â÷6ÖÆÃãÂöF—cà¢ÇåFö6F—&V7FÖVçFRVâFW'FÖVçFòFVÂÖ&6öç7VÇF"7W2ÖW&6F÷2’&V6–÷2fW&–f–6F÷2ãÂ÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ&&6¶WB×&W7VÇG2æVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ç·6VÆV7FVDFW'FÖVçBçFõWW$66R‚—ÓÂöF—cà¢Æƒ#ä6ö×&F÷"÷"&öGV7FóÂöƒ#à¢ÆF—b6Æ74æÖSÒ&&6¶WB×&öGV7B×F'2#ç¶&6¶WE&öGV7G2æÖ‚‡&öGV7B’ÓâÆ'WGFöâ¶W“×·&öGV7GÒ6Æ74æÖS×·6VÆV7FVD&6¶WE&öGV7BÓÓÒ&öGV7Bò&7F—fR"¢"'Òöä6Æ–6³×²‚’Óâ6WE6VÆV7FVD&6¶WE&öGV7B‡&öGV7B—Óç·&öGV7GÓÂö'WGFöãâ—ÓÂöF—cà¢ÆF—b6Æ74æÖSÒ&&6¶WB×&VfW&Væ6R#à¢Ç6ÖÆÃå$TdU$Tä4”D•5ôä”$ÄSÂ÷6ÖÆÃà¢¶æF–öæÅ&VfW&Væ6W5·6VÆV7FVD&6¶WE&öGV7EÒòÃãÆ#ä'2¶æF–öæÅ&VfW&Væ6W5·6VÆV7FVD&6¶WE&öGV7EÒç&–6RçFôf—†VBƒ"—Òò¶æF–öæÅ&VfW&Væ6W5·6VÆV7FVD&6¶WE&öGV7EÒçVæ—GÓÂö#ãÇ7ãç¶æF–öæÅ&VfW&Væ6W5·6VÆV7FVD&6¶WE&öGV7EÒç6÷W&6WÓÂ÷7ããÂóâ¢ÃãÆ#äW7W&æFòFF÷2fW&–f–6F÷3Âö#ãÇ7ãäæòÖ÷7G&Ö÷2&V6–÷26–âgVVçFRòfV6†ãÂ÷7ããÂóçĞ¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&6¶WBÖ·—2#à¢ÆF—cãÇ6ÖÆÃå$ôÔTD”ò$TdU$Tä4”ÃÂ÷6ÖÆÃãÆ#ç·6VÆV7FVD&6¶WDfW&vRÓÓÒçVÆÂò.(	B"¢'2G·6VÆV7FVD&6¶WDfW&vRçFôf—†VBƒ"—ÖÓÂö#ãÇ7ãç·6VÆV7FVD&6¶WE&W÷'G2æÆVæwF‡ÒFF÷2+rò¶&6¶WEVæ—GÓÂ÷7ããÂöF—cà¢ÆF—cãÇ6ÖÆÃå$ätòô%4U%dDóÂ÷6ÖÆÃãÆ#ç¶&6¶WDÖ–âÓÓÒçVÆÂò.(	B"¢G¶&6¶WDÖ–âçFôf—†VBƒ"—Ş(	2G¶&6¶WDÖƒòçFôf—†VBƒ"—ÖÓÂö#ãÇ7ãæÜ:Öæ–Öş(	6Ü:†–ÖóÂ÷7ããÂöF—cà¢ÆF—b6Æ74æÖS×·6VÆV7FVD&6¶WD6†ævRÓÓÒçVÆÂò""¢6VÆV7FVD&6¶WD6†ævRâò'&–6R×W"¢'&–6RÖF÷vâ'ÓãÇ6ÖÆÃì9¤ÅD”Ôò4Ô$”óÂ÷6ÖÆÃãÆ#ç·6VÆV7FVD&6¶WD6†ævRÓÓÒçVÆÂò.(	B"¢G·6VÆV7FVD&6¶WD6†ævRâò"²"¢"'ÒG·6VÆV7FVD&6¶WD6†ævRçFôf—†VBƒ—ÒVÓÂö#ãÇ7ãçg2â&W÷'FRçFW&–÷#Â÷7ããÂöF—cà¢ÂöF—cà¢·6VÆV7FVD&6¶WE&W÷'G2æÆVæwF‚âbbÆF—b6Æ74æÖSÒ&&6¶WB×&–6RÖÖ÷F–öâ"&–ÖÆ&VÃÒ$WföÇV6œ;6âFR&V6–÷2#ãÆF—b6Æ74æÖSÒ&Ö÷F–öâÖw&–B#çµ²ââç6VÆV7FVD&6¶WE&W÷'G5Òç&WfW'6R‚’ç6Æ–6R‚Ó"’æÖ‚‡&W÷'B’Óâ²6öç7B6V–Æ–ærÒ&6¶WDÖ‚ÇÂçVÖ&W"‡&W÷'Bç&–6R“²6öç7BfÆö÷"Ò&6¶WDÖ–âÇÂ²6öç7B†V–v‡BÒ6V–Æ–ærÓÓÒfÆö÷"òc"¢#B²‚„çVÖ&W"‡&W÷'Bç&–6R’ÒfÆö÷"’ò†6V–Æ–ærÒfÆö÷"’’¢s²&WGW&âÆ'WGFöâ¶W“×·&W÷'Bæ–GÒF—FÆS×¶G·&W÷'BæÖ&¶WGÓ¢'2G´çVÖ&W"‡&W÷'Bç&–6R’çFôf—†VBƒ"—ÖÒ7G–ÆS×·²†V–v‡C¢G¶†V–v‡GÒV×ÓãÇ7ãç´çVÖ&W"‡&W÷'Bç&–6R’çFôf—†VBƒ"—ÓÂ÷7ããÂö'WGFöãã²Ò—ÓÂöF—cãÇ6ÖÆÃä†—7L;7&–6òf–ÇG&Fò+r6F&'&W2Vâ&V6–ò&ö&FóÂ÷6ÖÆÃãÂöF—cçĞ¢ÆF—b6Æ74æÖSÒ&Ö&¶WB×&–6RÖÆ—7B#à¢·6VÆV7FVD&6¶WE&W÷'G2æÆVæwF‚ò6VÆV7FVD&6¶WE&W÷'G2æÖ‚‡&W÷'B’ÓâÆF—b¶W“×·&W÷'Bæ–GÓãÇ7ããÆ#ç·&W÷'BæÖ&¶WGÓÂö#ãÇ6ÖÆÃç·&W÷'Bæ6—G—Ò+r¶æWrFFR‡&W÷'BçW&6†6VEööâ’çFôÆö6ÆTFFU7G&–ær‚&W2Ô$ò"—Ò+r·&W÷'BæW7F–ÖFVBò&W7F–ÖFòÂæòöf–6–Â"¢&÷'FR6ö×Væ—F&–ò&ö&Fò'ÓÂ÷6ÖÆÃãÂ÷7ããÇ7G&öæsä'2´çVÖ&W"‡&W÷'Bç&–6R’çFôf—†VBƒ"—Òò·&W÷'BçVæ—GÓÂ÷7G&öæsãÂöF—câ’¢Çä;¦âæòW†—7FVâ&V6–÷2&VfW&Væ6–ÆW2&W7F÷2f–ÇG&÷2ãÂ÷çĞ¢ÂöF—cà¢Âö'F–6ÆSà¢ÂöF—cà¢Æ'F–6ÆR6Æ74æÖSÒ&&6¶WB×&æ¶–æræVÂ#à¢ÆF—cãÇ7â6Æ74æÖSÒ'æVÂÖÆ&VÂ#å$ôÔTD”õ2õ"DU%DÔTåDóÂ÷7ããÆƒ#ç·6VÆV7FVD&6¶WE&öGV7GÒ+r'2÷¶&6¶WEVæ—GÓÂöƒ#ãÇä6Æ7VÆFò6öâ&VfW&Væ6–2W7F–ÖF2’÷'FW26ö×Væ—F&–÷2&ö&F÷2FVÂW&–öFò6VÆV66–öæFòãÂ÷ãÂöF—cà¢ÆF—b6Æ74æÖSÒ&FW'FÖVçBÖ&'2#ç¶&6¶WDFW'FÖVçE7FG2æÆVæwF‚ò&6¶WDFW'FÖVçE7FG2æÖ‚‡&÷r’ÓâÆ'WGFöâ¶W“×·&÷ræFW'FÖVçGÒ6Æ74æÖS×·6VÆV7FVDFW'FÖVçBÓÓÒ&÷ræFW'FÖVçBò&7F—fR"¢"'Òöä6Æ–6³×²‚’Óâ6WE6VÆV7FVDFW'FÖVçB‡&÷ræFW'FÖVçB—ÓãÇ7ããÆ#ç·&÷ræFW'FÖVçGÓÂö#ãÇ6ÖÆÃç·&÷ræ6÷VçGÒ&W÷'FW3Â÷6ÖÆÃãÂ÷7ããÆ’7G–ÆS×·²v–GFƒ¢G´ÖF‚æÖ‚ƒ"Â„çVÖ&W"‡&÷ræfW&vR’òÖF‚æÖ‚‚ââæ&6¶WDFW'FÖVçE7FG2æÖ‚†—FVÒ’ÓâçVÖ&W"†—FVÒæfW&vR’’’’¢—ÒV×ÓãÂö“ãÇ7G&öæsä'2´çVÖ&W"‡&÷ræfW&vR’çFôf—†VBƒ"—ÓÂ÷7G&öæsãÂö'WGFöãâ’¢ÆF—b6Æ74æÖSÒ&&6¶WBÖV×G’#ãÆ#ä;¦âæò†’7Vf–6–VçFW2FF÷26ö×&&ÆW2ãÂö#ãÇ7ãäÆ÷2÷'FW2vF÷2’&ö&F÷2—,:â6öç7G'W–VæFòW7FR&öÖVF–ò÷"FW'FÖVçFòãÂ÷7ããÂöF—cçÓÂöF—cà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ&&6¶WBÖ6öçG&–'WF–öâæVÂ#à¢ÆF—cãÇ7â6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä4ôÕTä”DBtDÂ÷7ããÆƒ#ì+ôÆòVæ6öçG&7FRÖVæ÷"&V6–óóÂöƒ#ãÇä6ö×'FRL;6æFR6ö×&7FRâGR÷'FR6RV&Æ–6,:;¦æ–6ÖVçFRFW7\:—2FRVæ&Wf—6œ;6âãÂ÷ãÂöF—cà¢¶†5–D66W72òÆf÷&Òöå7V&Ö—C×·7V&Ö—D&6¶WE&–6WÓà¢Ç6VÆV7B¶W“×¶&öGV7BÒG·6VÆV7FVD&6¶WE&öGV7GÖÒæÖSÒ'&öGV7B"&WV—&VBFVfVÇEfÇVS×·6VÆV7FVD&6¶WE&öGV7GÓç¶&6¶WE&öGV7G2æÖ‚‡’ÓâÆ÷F–öâ¶W“×·Óç·ÓÂö÷F–öãâ—ÓÂ÷6VÆV7Cà¢Ç6VÆV7B¶W“×¶FW'FÖVçBÒG·6VÆV7FVDFW'FÖVçGÖÒæÖSÒ&FW'FÖVçB"&WV—&VBFVfVÇEfÇVS×·6VÆV7FVDFW'FÖVçGÓç¶&öÆ—f–FW'FÖVçG2æÖ‚†B’ÓâÆ÷F–öâ¶W“×¶GÓç¶GÓÂö÷F–öãâ—ÓÂ÷6VÆV7Cà¢Æ–çWBæÖSÒ&6—G’"&WV—&VBÆ6V†öÆFW#Ò$6—VFB"óà¢Æ–çWBæÖSÒ&Ö&¶WB"&WV—&VBÆ6V†öÆFW#Ò$ÖW&6FòÂF–VæFò7WW&ÖW&6Fò"óà¢Æ–çWBæÖSÒ'&–6R"&WV—&VBG—SÒ&çVÖ&W""Ö–ãÒ#ã"7FWÒ#ã"Æ6V†öÆFW#Ò%&V6–òvFò„'2’"óà¢Ç6VÆV7BæÖSÒ'Væ—B"&WV—&VCãÆ÷F–öâfÇVSÒ&¶r#ä¶–Æöw&ÖóÂö÷F–öããÆ÷F–öâfÇVSÒ&Æ—G&ò#äÆ—G&óÂö÷F–öããÆ÷F–öâfÇVSÒ&Fö6Væ#äFö6VæÂö÷F–öããÆ÷F–öâfÇVSÒ&'&ö&#ä'&ö&Âö÷F–öããÆ÷F–öâfÇVSÒ'V–çFÂ#åV–çFÃÂö÷F–öããÆ÷F–öâfÇVSÒ'Væ–FB#åVæ–FCÂö÷F–öããÂ÷6VÆV7Cà¢Æ–çWBæÖSÒ'W&6†6VDöâ"&WV—&VBG—SÒ&FFR"FVfVÇEfÇVS×¶æWrFFR‚’çFô•4õ7G&–ær‚’ç6Æ–6RƒÂ—Òóà¢Æ'WGFöãäVçf–"&V6–ò&&Wf—6œ;6ãÂö'WGFöãà¢Âöf÷&Óâ¢Æ'WGFöâ6Æ74æÖSÒ'&7F–6R"öä6Æ–6³×²‚’Óâ6WEf–Wr†WF…W6W"ò'Æç2"¢&Æöv–â"—Óä66VFR6öâVâÆâ&÷'F"&V6–÷3Âö'WGFöãçĞ¢¶&6¶WDÖW76vRbbÇ6Æ74æÖSÒ&&6¶WBÖÖW76vR#ç¶&6¶WDÖW76vWÓÂ÷çĞ¢Âö'F–6ÆSà¢Ç6Æ74æÖSÒ&&6¶WBÖF—66Æ–ÖW"#äÆ÷2fÆ÷&W2Ö&6F÷26öÖòW7F–ÖF÷26öâ&VfW&Væ6–2÷&–VçFF—f2æòöf–6–ÆW3¢æò6÷'&W7öæFVâæV6W6&–ÖVçFRVæ6÷F—¦6œ;6âö'6W'fFVâVâÖW&6FòâÆ÷2÷'FW26ö×Væ—F&–÷2&ö&F÷26R–FVçF–f–6â÷"6W&FòâÆ÷2&V6–÷2VVFVâ6Ö&–"6V|;¦âÖW&6FòÂÖ&6Â6Æ–FB’†÷&&–ó²VÂ•2FVÂ”äR6öçF–ì;¦6–VæFòVÂ–æF–6F÷"öf–6–ÂFR–æfÆ6œ;6âãÂ÷à¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&gVVÂ"bbÄgVVÅ7WÇ”F6†&ö&BóçĞ¢·f–WrÓÓÒ&6öÖ×Væ—G’"bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vR6öÖ×Væ—G’×vR#à¢ÆF—b6Æ74æÖSÒ'vR×F—FÆR#à¢Ç7ãä4ôÕTä”DB5$•DõTÅ4óÂ÷7ãà¢Æƒä&VæFW"FÖ&œ:–âW2W‡Æ–6"ãÂöƒà¢Çà¢Æ÷2÷'FW26RFW7F6â÷"6Æ&–FB’WF–Æ–FBÂæò÷"&öÖWFW ¢vææ6–2à¢Â÷à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&6öÖ×Væ—G’ÖÆ–÷WB#à¢Æ'F–6ÆR6Æ74æÖSÒ&6öÖÖVçBÖf÷&ÒæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä4ôÕ%DRERì8Ä•4•3ÂöF—cà¢Æƒ3ì+õ\:’FVæFVæ6–W7L:2ö'6W'fæFóóÂöƒ3à¢Ç6VÆV7@¢&–ÖÆ&VÃÒ$7F—fòFVÂ6öÖVçF&–ò ¢fÇVS×¶6öÖÖVçD76WGĞ¢öä6†ævS×²†R’Óâ6WD6öÖÖVçD76WB†RçF&vWBçfÇVR—Ğ¢à¢Æ÷F–öãç¶6ö–âç7–Ö&öÇÓÂö÷F–öãà¢Æ÷F–öãåU4Bô$ô#Âö÷F–öãà¢·f—6–&ÆT6ö–ç2æÖ‚†2’Óâ€¢Æ÷F–öâ¶W“×¶2æ–GÒfÇVS×¶2ç7–Ö&öÇÓà¢¶2ææÖWÒ+r¶2ç7–Ö&öÇĞ¢Âö÷F–öãà¢’—Ğ¢Â÷6VÆV7Cà¢ÇFW‡F&V¢fÇVS×¶6öÖÖVçGĞ¢öä6†ævS×²†R’Óâ6WD6öÖÖVçB†RçF&vWBçfÇVR—Ğ¢Æ6V†öÆFW#Ò$W‡Æ–6\:’ö'6W'f2ÂVâ\:’Æ¦ò’\:’&–W6vò6öç6–FW&,:Ö>(
b ¢óà¢Æ'WGFöâ6Æ74æÖSÒ'&7F–6R"öä6Æ–6³×·V&Æ—6„6öÖÖVçGÓà¢V&Æ–6"ì:Æ—6—0¢Âö'WGFöãà¢Ç6ÖÆÃà¢æòV&Æ—VW2FF÷2W'6öæÆW2æ’f—&ÖW2VRVâ&W7VÇFFòW7L:¢v&çF—¦Fòà¢Â÷6ÖÆÃà¢Âö'F–6ÆSà¢ÆF—b6Æ74æÖSÒ&6öÖÖVçBÖfVVB#à¢¶6öÖÖVçG2æÖ‚†2Â’’Óâ€¢Æ'F–6ÆR6Æ74æÖSÒ&6öÖÖVçBÖ6&BæVÂ"¶W“×¶G¶2ææÖWÒÒG¶—ÖÓà¢ÆF—b6Æ74æÖSÒ&6öÖÖVçBÖWF†÷"#à¢Ç7ãç¶2ææÖU³×ÓÂ÷7ãà¢ÆF—cà¢Æ#ç¶2ææÖWÓÂö#à¢Ç6ÖÆÃç¶2æ&FvWÓÂ÷6ÖÆÃà¢ÂöF—cà¢ÆVÓç¶2æ76WGÓÂöVÓà¢ÂöF—cà¢Çç¶2çFW‡GÓÂ÷à¢ÆF—b6Æ74æÖSÒ&6öÖÖVçBÖ7F–öç2#à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óà¢6WD6öÖÖVçG2‚†ÆÂ’Óà¢ÆÂæÖ‚‡‚Â¢’Óà¢¢ÓÓÒ’ò²ââç‚ÂW6VgVÃ¢‚çW6VgVÂ²Ò¢‚À¢’À¢¢Ğ¢à¢)xbÖR6—'fœ;2+r¶2çW6VgVÇĞ¢Âö'WGFöãà¢Ç7ãî)ˆR¶2ç66÷&RÇÂ$çVWfò'ÓÂ÷7ãà¢Æ'WGFöãå6VwV—"æÆ—7FÂö'WGFöãà¢ÂöF—cà¢¶2çW6VgVÂãÒ3bb€¢ÆF—b6Æ74æÖSÒ&W‡W'BÖæ÷FR#à¢÷'FR×W’fÆ÷&Fò÷"Æ6ö×Væ–FB+r6–wVR6ö×'F–VæFğ¢ì:Æ—6—26Æ&÷0¢ÂöF—cà¢—Ğ¢Âö'F–6ÆSà¢’—Ğ¢ÂöF—cà¢ÂöF—cà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&Æöv–â"bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vRWF‚×vR#à¢Æf÷&Ò6Æ74æÖSÒ&WF‚Ö6&BæVÂ"öå7V&Ö—C×·6–vä–çÓà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä44U4ò4TuU$óÂöF—cà¢Æƒä–æ–6–"6W6œ;6ãÂöƒà¢Çà¢–æw&W66öâÆ7VVçF†&–Æ—FF÷"7&—FõVÇ6òâÆ7&V6œ;6à¢;¦&Æ–6FR7VVçF2W&ÖæV6R6W'&Fà¢Â÷à¢ÆÆ&VÃà¢6÷'&VòVÆV7G,;6æ–6ğ¢Æ–çW@¢G—SÒ&VÖ–Â ¢WFô6ö×ÆWFSÒ&VÖ–Â ¢&WV—&V@¢fÇVS×¶WF„VÖ–ÇĞ¢öä6†ævS×²†R’Óâ6WDWF„VÖ–Â†RçF&vWBçfÇVR—Ğ¢Æ6V†öÆFW#Ò'GT6÷'&Vòæ6öÒ ¢óà¢ÂöÆ&VÃà¢ÆÆ&VÃà¢6öçG&6\;¢Æ–çW@¢G—SÒ'77v÷&B ¢WFô6ö×ÆWFSÒ&7W'&VçB×77v÷&B ¢&WV—&V@¢fÇVS×¶WF…77v÷&GĞ¢öä6†ævS×²†R’Óâ6WDWF…77v÷&B†RçF&vWBçfÇVR—Ğ¢Æ6V†öÆFW#Ò.(
.(
.(
.(
.(
.(
.(
.(
" ¢óà¢ÂöÆ&VÃà¢¶WF„ÖW76vRbbÆF—b6Æ74æÖSÒ&WF‚ÖW'&÷"#ç¶WF„ÖW76vWÓÂöF—cçĞ¢Æ'WGFöâ6Æ74æÖSÒ'&7F–6R"F—6&ÆVC×¶WF„ÆöF–æwÓà¢¶WF„ÆöF–ærò%fW&–f–6æFş(
b"¢$VçG&"'Ğ¢Âö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖSÒ&WF‚ÖÆöv÷WB ¢F—6&ÆVC×¶WF„ÆöF–æwĞ¢öä6Æ–6³×·&V6÷fW%77v÷&GĞ¢à¢öÇf–L:’Ö’6öçG&6\;¢Âö'WGFöãà¢¶WF…W6W"bb€¢Æ'WGFöâG—SÒ&'WGFöâ"6Æ74æÖSÒ&WF‚ÖÆöv÷WB"öä6Æ–6³×·6–vä÷WGÓà¢6W'&"6W6œ;6â7GVÀ¢Âö'WGFöãà¢—Ğ¢Ç6ÖÆÃà¢æò6ö×'F2GR6öçG&6\;â7&—FõVÇ6òçVæ6FRÆ6öÆ–6—F,:÷ ¢6†Bà¢Â÷6ÖÆÃà¢Âöf÷&Óà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&FÖ–â"bb—4FÖ–âbb€¢Ç6V7F–öâ6Æ74æÖSÒ'vRFÖ–â×vR#à¢ÆF—b6Æ74æÖSÒ'vR×F—FÆR#à¢Ç7ãåäTÂDÔ”ä•5E$Dõ#Â÷7ãà¢ÆƒåfVçF2’†&–Æ—F6œ;6âFRÆæW2ãÂöƒà¢Çà¢fW&–f–6VÂ6ö×&ö&çFRçFW2FR†&–Æ—F"6—FÂf—'GVÂÀ¢W7V&–òà¢Â÷à¢Æ'WGFöâ6Æ74æÖSÒ&WF‚ÖÆöv÷WB"öä6Æ–6³×·6–vä÷WGÓà¢6W'&"6W6œ;6à¢Âö'WGFöãà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&FÖ–â×7FG2#à¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃå4ôÄ”4•ETDU2TäD”TåDU3Â÷6ÖÆÃà¢Æ#à¢¶FÖ–å&WVW7G2æf–ÇFW"‚‡"’Óâ"ç7FGW2ÓÓÒ'VæF–ær"’æÆVæwF‡Ğ¢Âö#à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃåtõ2dU$”d”4Dõ3Â÷6ÖÆÃà¢Æ#à¢°¢FÖ–å&WVW7G2æf–ÇFW"€¢‡"’Óâ"ç7FGW2ÓÓÒ&–çf—FVB"ÇÂ"ç7FGW2ÓÓÒ&&÷fVB"À¢’æÆVæwF€¢Ğ¢Âö#à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ#à¢Ç6ÖÆÃå$TdU$Tä4”$#Â÷6ÖÆÃà¢Æ#ä'2¶&ÇVRæöff–6–ÂçFôf—†VBƒ"—ÓÂö#à¢Ç7ãç÷"U4BFVÂÆãÂ÷7ãà¢Âö'F–6ÆSà¢ÂöF—cà¢Æ'F–6ÆR6Æ74æÖSÒ&FÖ–â×F&ÆRæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂ×F÷#à¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#å4ôÄ”4•ETDU2DR4ôÕ$ÂöF—cà¢Æƒ3åv÷2÷"fW&–f–6#Âöƒ3à¢ÂöF—cà¢Æ'WGFöãäW‡÷'F"fVçF3Âö'WGFöãà¢ÂöF—cà¢¶æ÷F–6RbbÆF—b6Æ74æÖSÒ'ÆâÖæ÷F–6R#ç¶æ÷F–6WÓÂöF—cçĞ¢¶ÖçVÄ66W72bb€¢ÆF—b6Æ74æÖSÒ'ÆâÖæ÷F–6R#à¢Æ#ä66W6òÖçVÂÆ—7Fò+r<;7–Æò†÷&Âö#à¢Çä6÷'&Vó¢¶ÖçVÄ66W72æVÖ–ÇÓÂ÷à¢Çåv†G4¢¶ÖçVÄ66W72çv†G6ÇÂ$æò&Vv—7G&Fò'ÓÂ÷à¢Çä6öçG&6\;FV×÷&Ã¢Ç7G&öæsç¶ÖçVÄ66W72ç77v÷&GÓÂ÷7G&öæsãÂ÷à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×¶7–æ2‚’Óâ°¢v—Bæf–vF÷"æ6Æ—&ö&Bçw&—FUFW‡B€¢7&—FõVÇ6õÆä6÷'&Vó¢G¶ÖçVÄ66W72æVÖ–ÇÕÆä6öçG&6\;FV×÷&Ã¢G¶ÖçVÄ66W72ç77v÷&GÕÆä–æw&W6ó¢‡GG3¢òö7&—Fò×VÇ6òçfW&6VÂæÀ¢“°¢6WDæ÷F–6R‚$FF÷2FR66W6ò6÷–F÷2â"“°¢×Ğ¢à¢6÷–"FF÷2&VÂ6Æ–VçFP¢Âö'WGFöãà¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×²‚’Óâ6WDÖçVÄ66W72†çVÆÂ—Óà¢–Æ÷2wV&L:¢Âö'WGFöãà¢ÂöF—cà¢—Ğ¢ÆF—b6Æ74æÖSÒ&FÖ–â×&÷rFÖ–âÖ†VB#à¢Ç7ãåU5T$”óÂ÷7ãà¢Ç7ãåÄãÂ÷7ãà¢Ç7ãåtóÂ÷7ãà¢Ç7ãäÜ8•DôDóÂ÷7ãà¢Ç7ãäU5DDóÂ÷7ãà¢Ç7ãä44œ94ãÂ÷7ãà¢ÂöF—cà¢¶FÖ–å&WVW7G2ç6öÖR‚‡"’Óâ"ç7FGW2ÓÓÒ'VæF–ær"’ò€¢FÖ–å&WVW7G0¢æf–ÇFW"‚‡"’Óâ"ç7FGW2ÓÓÒ'VæF–ær"¢æÖ‚‡"’Óâ€¢ÆF—b6Æ74æÖSÒ&FÖ–â×&÷r"¶W“×·"æ–GÓà¢Æ#à¢·"ægVÆÅöæÖWĞ¢Ç6ÖÆÃç·"æVÖ–ÇÓÂ÷6ÖÆÃà¢Ç6ÖÆÃåv†G4¢·"çv†G6ÇÂ$æò&Vv—7G&Fò'ÓÂ÷6ÖÆÃà¢Âö#à¢Ç7ãà¢·"çÆà¢ç&WÆ6R‚&&6–5ö&ò"Â$,:6–6ò$ò"¢ç&WÆ6R‚&7'—Fõó"Â$7&—Fò"¢ç&WÆ6R‚&7'—Fõó#"Â$7&—Fò#"—Ğ¢Â÷7ãà¢Ç7ãà¢Æ#ç·"ç–EöÖ÷VçGÓÂö#à¢Ç6ÖÆÃåÆã¢·"æÖ÷VçEöÆ&VÇÓÂ÷6ÖÆÃà¢Â÷7ãà¢Ç7ãà¢·"ç–ÖVçEöÖWF†öBÓÓÒ'""ò%"&öÆ—f–"¢$—'FÒ'Ğ¢Â÷7ãà¢ÆVĞ¢6Æ74æÖS×°¢"ç7FGW2ÓÓÒ&–çf—FVB ¢ò'W ¢¢"ç7FGW2ÓÓÒ'&V¦V7FVB ¢ò&F÷vâ ¢¢'v—BÖ6öÆ÷" ¢Ğ¢à¢·"ç7FGW2ÓÓÒ'VæF–ær ¢ò%VæF–VçFR ¢¢"ç7FGW2ÓÓÒ&–çf—FVB ¢ò$–çf—FFò ¢¢%&V6†¦Fò'Ğ¢ÂöVÓà¢Ç7â6Æ74æÖSÒ&FÖ–âÖ7F–öç2#à¢·"ç&V6V—E÷W&Âbb€¢Æ¢‡&Vc×·"ç&V6V—E÷W&ÇĞ¢F&vWCÒ%ö&Ææ² ¢&VÃÒ&æ÷&VfW'&W" ¢à¢fW"6ö×&ö&çFP¢Âöà¢—Ğ¢Æ'WGFöà¢F—6&ÆVC×·"ç7FGW2ÓÒ'VæF–ær'Ğ¢öä6Æ–6³×²‚’Óâ&Wf–Wu–ÖVçB‡"æ–BÂ&&÷fR"—Ğ¢à¢&ö& ¢Âö'WGFöãà¢Æ'WGFöà¢F—6&ÆVC×·"ç7FGW2ÓÒ'VæF–ær'Ğ¢öä6Æ–6³×²‚’Óâ&Wf–Wu–ÖVçB‡"æ–BÂ&ÖçVÂ"—Ğ¢à¢66W6òÖçVÀ¢Âö'WGFöãà¢Æ'WGFöà¢F—6&ÆVC×·"ç7FGW2ÓÒ'VæF–ær'Ğ¢öä6Æ–6³×²‚’Óâ&Wf–Wu–ÖVçB‡"æ–BÂ'&V¦V7B"—Ğ¢à¢&V6†¦ ¢Âö'WGFöãà¢Æ'WGFöà¢6Æ74æÖSÒ&FævW"Ö7F–öâ ¢F—6&ÆVC×·"ç7FGW2ÓÒ'VæF–ær'Ğ¢öä6Æ–6³×²‚’ÓâFVÆWFU–ÖVçEW6W"‡"—Ğ¢à¢VÆ–Ö–æ"W7V&–ğ¢Âö'WGFöãà¢Â÷7ãà¢ÂöF—cà¢’¢’¢€¢ÇäæòW†—7FVâ6öÆ–6—GVFW2FRvòFöFl:ÖãÂ÷à¢—Ğ¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ&FÖ–â×F&ÆRæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂ×F÷#à¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ä„•5Dõ$”ÃÂöF—cà¢Æƒ3åv÷2fW&–f–6F÷2’&ö6W6F÷3Âöƒ3à¢ÂöF—cà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&FÖ–â×&÷rFÖ–âÖ†VB#à¢Ç7ãåU5T$”óÂ÷7ãà¢Ç7ãåÄãÂ÷7ãà¢Ç7ãä”Õõ%DRtDóÂ÷7ãà¢Ç7ãäÜ8•DôDóÂ÷7ãà¢Ç7ãäU5DDóÂ÷7ãà¢Ç7ãä4ôÕ$ô$åDRò44œ94ãÂ÷7ãà¢ÂöF—cà¢¶FÖ–å&WVW7G2ç6öÖR‚‡"’Óâ"ç7FGW2ÓÒ'VæF–ær"’ò€¢FÖ–å&WVW7G0¢æf–ÇFW"‚‡"’Óâ"ç7FGW2ÓÒ'VæF–ær"¢æÖ‚‡"’Óâ€¢ÆF—b6Æ74æÖSÒ&FÖ–â×&÷r"¶W“×¶†—7F÷'’ÒG·"æ–GÖÓà¢Æ#à¢·"ægVÆÅöæÖWĞ¢Ç6ÖÆÃç·"æVÖ–ÇÓÂ÷6ÖÆÃà¢Ç6ÖÆÃåv†G4¢·"çv†G6ÇÂ$æò&Vv—7G&Fò'ÓÂ÷6ÖÆÃà¢Âö#à¢Ç7â6Æ74æÖSÒ&FÖ–âÖ7F–öç2#à¢·"çÆà¢ç&WÆ6R‚&&6–5ö&ò"Â$,:6–6ò$ò"¢ç&WÆ6R‚&7'—Fõó"Â$7&—Fò"¢ç&WÆ6R‚&7'—Fõó#"Â$7&—Fò#"—Ğ¢Â÷7ãà¢Ç7ãç·"ç–EöÖ÷VçGÓÂ÷7ãà¢Ç7ãà¢·"ç–ÖVçEöÖWF†öBÓÓÒ'""ò%"&öÆ—f–"¢$—'FÒ'Ğ¢Â÷7ãà¢ÆVÒ6Æ74æÖS×·"ç7FGW2ÓÓÒ'&V¦V7FVB"ò&F÷vâ"¢'W'Óà¢·"ç7FGW2ÓÓÒ'&V¦V7FVB ¢ò%&V6†¦Fò ¢¢"ç7FGW2ÓÓÒ&&÷fVB ¢ò%fW&–f–6Fò ¢¢$–çf—FFò'Ğ¢ÂöVÓà¢Ç7ãà¢·"ç&V6V—E÷W&Âbb€¢Æ¢‡&Vc×·"ç&V6V—E÷W&ÇĞ¢F&vWCÒ%ö&Ææ² ¢&VÃÒ&æ÷&VfW'&W" ¢à¢fW"6ö×&ö&çFP¢Âöà¢—Ğ¢·"ç7FGW2ÓÓÒ&–çf—FVB"bb€¢Æ'WGFöâöä6Æ–6³×²‚’Óâ&Wf–Wu–ÖVçB‡"æ–BÂ&ÖçVÂ"—Óà¢66W6òÖçVÀ¢Âö'WGFöãà¢—Ğ¢Â÷7ãà¢ÂöF—cà¢’¢’¢€¢Çä;¦âæòW†—7FVâv÷2&ö6W6F÷2ãÂ÷à¢—Ğ¢Âö'F–6ÆSà¢ÆF—b6Æ74æÖSÒ&FÖ–âÖæ÷FRæVÂ#à¢Æ#äÜ:—FöF÷2FR6ö'&ò6öæf–wW&F÷3Âö#à¢Çà¢&öÆ—f–¢"–öÆòvòFR&æ6òvæFW&òæöÖ'&RFRæVÇ6öâÖVæF÷¦¢F÷'&W2âW‡FW&–÷#¢—'FÒÖVF–çFR—'FÒæÖRöæVÇ6öæÃ¶ÆöF‡3bâ6F¢&ö&6œ;6âVçl:ÖVæ–çf—F6œ;6âÂ6÷'&VòfW&–f–6FòFVÀ¢W7GVF–çFRà¢Â÷à¢ÂöF—cà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&6FV×’"bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vR6FV×’#à¢ÆF—b6Æ74æÖSÒ'vR×F—FÆR#à¢Ç7ãä4DTÔ”5$•DõTÅ4óÂ÷7ãà¢Æƒä&VæFRçFW2FRFV6–F—"ãÂöƒà¢Çà¢'WF2'&WfW26öâW‡Æ–66œ;6âÂV¦W&6–6–ò’Æ–66œ;6âVâVÀ¢6–×VÆF÷"âVÂ6öçFVæ–FòW2VGV6F—fòÂæò6W6÷&Ö–VçFòf–ææ6–W&òà¢Â÷à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&6÷W'6RÖw&–B#à¢¶6FV×”ÖöGVÆW2æÖ‚†6÷W'6RÂ–æFW‚’Óâ€¢Æ'F–6ÆP¢6Æ74æÖS×¶6÷W'6RæVÂG²†5–D66W72bb–æFW‚âò&Æö6¶VBÖ6÷W'6R"¢"'ÖĞ¢¶W“×¶6÷W'6Ræ–GĞ¢à¢Ç7ãç¶6÷W'6RæçVÖ&W'ÓÂ÷7ãà¢Ç6ÖÆÃç¶6÷W'6RæÆW76öç2æÆVæwF‡ÒÆV66–öæW3Â÷6ÖÆÃà¢Æƒ3ç¶6÷W'6RçF—FÆWÓÂöƒ3à¢Çç¶6÷W'6Rç7VÖÖ'—ÓÂ÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óà¢†5–D66W72bb–æFW‚â ¢ò6WEf–Wr‚'Æç2"¢¢6WD÷Vä6÷W'6R†6÷W'6Ræ–B¢Ğ¢à¢²†5–D66W72bb–æFW‚â ¢ò/	ùI"&WV–W&RÆâ ¢¢$W7GVF–"Ü;6GVÆò(i"'Ğ¢Âö'WGFöãà¢Âö'F–6ÆSà¢’—Ğ¢ÂöF—cà¢¶6FV×”ÖöGVÆW0¢æf–ÇFW"‚†6÷W'6R’Óâ6÷W'6Ræ–BÓÓÒ÷Vä6÷W'6R¢æÖ‚†6÷W'6R’Óâ€¢Ç6V7F–öâ6Æ74æÖSÒ&6÷W'6RÖ6öçFVçBæVÂ"¶W“×¶6÷W'6Ræ–GÓà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äÜ94ETÄò¶6÷W'6RæçVÖ&W'ÓÂöF—cà¢Æƒ#ç¶6÷W'6RçF—FÆWÓÂöƒ#à¢Çç¶6÷W'6Rç7VÖÖ'—ÓÂ÷à¢ÆF—b6Æ74æÖSÒ&ÆW76öâÖÆ—7B#à¢¶6÷W'6RæÆW76öç0¢ç6Æ–6RƒÂ†5–D66W72ò6÷W'6RæÆW76öç2æÆVæwF‚¢¢æÖ‚†ÆW76öâÂ–æFW‚’Óâ€¢Æ'F–6ÆR¶W“×¶ÆW76öâçF—FÆWÓà¢Ç7ãäÄT44œ94â¶–æFW‚²ÓÂ÷7ãà¢Æƒ3ç¶ÆW76öâçF—FÆWÓÂöƒ3à¢Çç¶ÆW76öâæ6öçFVçGÓÂ÷à¢ÆF—b6Æ74æÖSÒ&W‡FVæFVB×&VF–ær#à¢Æ#äÆV7GW&6ö×ÆWFÂö#à¢Çç¶ÆW76öå&VF–æw5¶6÷W'6Ræ–EÓòå¶–æFW…×ÓÂ÷à¢ÂöF—cà¢ÆF—cà¢Æ#å,:7F–6wV–FÂö#à¢Çç¶ÆW76öâç&7F–6WÓÂ÷à¢ÂöF—cà¢Âö'F–6ÆSà¢’—Ğ¢ÂöF—cà¢¶†5–D66W72bb€¢Ç6V7F–öâ6Æ74æÖSÒ&ÖöGVÆRÖW†Ò#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äUdÅT4œ94âDTÂÜ94ETÄóÂöF—cà¢Æƒ#åfW&FFW&òòfÇ6óÂöƒ#à¢Çà¢&W7öæFRFW7\:—2FRÆVW"Æ27VG&òÆV66–öæW2âö'FVæG,:0¢VÂ&W7VÇFFò’VæW‡Æ–66œ;6â&6F&W7VW7Fà¢Â÷à¢¶ÖöGVÆUV—§¦W5¶6÷W'6Ræ–EÒæÖ‚‡VW7F–öâÂ–æFW‚’Óâ°¢6öç7Bç7vW$¶W’ÒG¶6÷W'6Ræ–GÒÒG¶–æFW‡Ö°¢6öç7B6VÆV7FVDç7vW"ÒV—¤ç7vW'5¶ç7vW$¶W•Ó°¢6öç7B7V&Ö—GFVBÒV—¥7V&Ö—GFVE¶6÷W'6Ræ–EÓ°¢6öç7B6÷'&V7BÒ6VÆV7FVDç7vW"ÓÓÒVW7F–öâæç7vW#°¢&WGW&â€¢Æ'F–6ÆP¢6Æ74æÖS×¶V—¢×VW7F–öâG·7V&Ö—GFVBò†6÷'&V7Bò'V—¢Ö6÷'&V7B"¢'V—¢×w&öær"’¢"'ÖĞ¢¶W“×·VW7F–öâç7FFVÖVçGĞ¢à¢Æ#à¢¶–æFW‚²Òâ·VW7F–öâç7FFVÖVçGĞ¢Âö#à¢ÆF—cà¢µ·G'VRÂfÇ6UÒæÖ‚‡fÇVR’Óâ€¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖS×°¢6VÆV7FVDç7vW"ÓÓÒfÇVRò'6VÆV7FVB"¢" ¢Ğ¢F—6&ÆVC×·7V&Ö—GFVGĞ¢öä6Æ–6³×²‚’Óà¢6WEV—¤ç7vW'2‚†ç7vW'2’Óâ‡°¢ââæç7vW'2À¢¶ç7vW$¶W•Ó¢fÇVRÀ¢Ò’¢Ğ¢¶W“×µ7G&–ær‡fÇVR—Ğ¢à¢·fÇVRò%fW&FFW&ò"¢$fÇ6ò'Ğ¢Âö'WGFöãà¢’—Ğ¢ÂöF—cà¢·7V&Ö—GFVBbb€¢Çà¢Ç7G&öæsç¶6÷'&V7Bò$6÷'&V7Fòâ"¢$–æ6÷'&V7Fòâ'ÓÂ÷7G&öæsç²"'Ğ¢·VW7F–öâæW‡ÆæF–öçĞ¢Â÷à¢—Ğ¢Âö'F–6ÆSà¢“°¢Ò—Ğ¢²V—¥7V&Ö—GFVE¶6÷W'6Ræ–EÒò€¢Æ'WGFöà¢6Æ74æÖSÒ&W†Ò×7V&Ö—B ¢F—6&ÆVC×¶ÖöGVÆUV—§¦W5¶6÷W'6Ræ–EÒç6öÖR€¢…÷VW7F–öâÂ–æFW‚’Óà¢V—¤ç7vW'5¶G¶6÷W'6Ræ–GÒÒG¶–æFW‡ÖÒÓÓÒVæFVf–æVBÀ¢—Ğ¢öä6Æ–6³×²‚’Óà¢6WEV—¥7V&Ö—GFVB‚‡7V&Ö—GFVB’Óâ‡°¢ââç7V&Ö—GFVBÀ¢¶6÷W'6Ræ–EÓ¢G'VRÀ¢Ò’¢Ğ¢à¢6Æ–f–6"W†ÖVà¢Âö'WGFöãà¢’¢€¢ÆF—b6Æ74æÖSÒ&W†Ò×&W7VÇB#à¢Æ#à¢&W7VÇFFó§²"'Ğ¢°¢ÖöGVÆUV—§¦W5¶6÷W'6Ræ–EÒæf–ÇFW"€¢‡VW7F–öâÂ–æFW‚’Óà¢V—¤ç7vW'5¶G¶6÷W'6Ræ–GÒÒG¶–æFW‡ÖÒÓÓĞ¢VW7F–öâæç7vW"À¢’æÆVæwF€¢Ğ¢÷¶ÖöGVÆUV—§¦W5¶6÷W'6Ræ–EÒæÆVæwF‡Ğ¢Âö#à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WEV—¥7V&Ö—GFVB‚‡7V&Ö—GFVB’Óâ‡°¢ââç7V&Ö—GFVBÀ¢¶6÷W'6Ræ–EÓ¢fÇ6RÀ¢Ò’“°¢6WEV—¤ç7vW'2‚†ç7vW'2’Óâ°¢6öç7BæW‡BÒ²ââæç7vW'2Ó°¢ÖöGVÆUV—§¦W5¶6÷W'6Ræ–EÒæf÷$V6‚€¢…÷VW7F–öâÂ–æFW‚’Óà¢FVÆWFRæW‡E¶G¶6÷W'6Ræ–GÒÒG¶–æFW‡ÖÒÀ¢“°¢&WGW&âæW‡C°¢Ò“°¢×Ğ¢à¢föÇfW"–çFVçF ¢Âö'WGFöãà¢ÂöF—cà¢—Ğ¢Â÷6V7F–öãà¢—Ğ¢²†5–D66W72bb€¢ÆF—b6Æ74æÖSÒ'&VÖ—VÒÖvFR6FV×’ÖvFR#à¢Æ#äÆV66œ;6â–çG&öGV7F÷&–w&GV—F6ö×ÆWFFÂö#à¢Çà¢7F—fVâÆâ&'&—"Æ2#BÆV66–öæW2ÂV¦W&6–6–÷2¢6–×VÆ6–öæW2wV–F2à¢Â÷à¢Æ'WGFöâöä6Æ–6³×²‚’Óâ6WEf–Wr‚'Æç2"—ÓäFW6&Æ÷VV"6FVÖ–Âö'WGFöãà¢ÂöF—cà¢—Ğ¢Â÷6V7F–öãà¢’—Ğ¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ'Æç2"bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vRÆç2#à¢ÆF—b6Æ74æÖSÒ'vR×F—FÆR#à¢Ç7ãåÄäU2DR,85D”4Â÷7ãà¢ÆƒäVÆ–vR7\:çFòV–W&W2&VæFW"ãÂöƒà¢Çà¢v2÷"66W6òVGV6F—fò’6—FÂf—'GVÂâæòW7L:2&VÆ—¦æFğ¢Væ–çfW'6œ;6âà¢Â÷à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'ÆâÖw&–B#à¢Æ'F–6ÆR6Æ74æÖSÒ'ÆâæVÂ#à¢Ç6ÖÆÃå%TT$Â÷6ÖÆÃà¢Æƒ#äw&F—3Âöƒ#à¢Ç7G&öæsà¢CãÆVÓçf—'GVÆW3ÂöVÓà¢Â÷7G&öæsà¢Çà¢F6†&ö&B;¦&Æ–6ğ¢Æ'"óà¢6–×VÆF÷",:6–6ğ¢Æ'"óà¢&–ÖW&2ÆV66–öæW0¢Â÷à¢Æ'WGFöâöä6Æ–6³×²‚’Óâ6WEf–Wr‚'6–×VÆF÷""—Óà¢V×W¦"w&F—0¢Âö'WGFöãà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'ÆâfVGW&VBæVÂ#à¢ÆF—b6Æ74æÖSÒ'÷VÆ"#äÜ8244U4”$ÄSÂöF—cà¢Ç6ÖÆÃä,84”4ò$ôÄ•d”Â÷6ÖÆÃà¢Æƒ#à¢CÆVÓãÒ'2¶&ÇVRæöff–6–ÂçFôf—†VBƒ"—ÓÂöVÓà¢Âöƒ#à¢Ç7G&öæsà¢CãÆVÓçf—'GVÆW3ÂöVÓà¢Â÷7G&öæsà¢Çà¢6–×VÆF÷"6ö×ÆWFğ¢Æ'"óà¢†—7F÷&–ÂFR&W7VÇFF÷0¢Æ'"óà¢6FVÖ–W6Væ6–À¢Â÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WE–ÖVçEÆâ‚&&6–5ö&ò"“°¢6WE–ÖVçDÖWF†öB‚'""“°¢×Ğ¢à¢fW""FRvğ¢Âö'WGFöãà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'ÆâæVÂ#à¢Ç6ÖÆÃä5$•DòÂ÷6ÖÆÃà¢Æƒ#ãU4ECÂöƒ#à¢Ç7G&öæsà¢CããÆVÓçf—'GVÆW3ÂöVÓà¢Â÷7G&öæsà¢Çà¢–æF–6F÷&W2fç¦F÷0¢Æ'"óà¢f&–÷2÷'FföÆ–÷0¢Æ'"óà¢6ö×&6œ;6âFRW7G&FVv–0¢Â÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WE–ÖVçEÆâ‚&7'—Fõó"“°¢6WE–ÖVçDÖWF†öB‚&—'FÒ"“°¢×Ğ¢à¢v"÷"—'FĞ¢Âö'WGFöãà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'ÆâæVÂ#à¢Ç6ÖÆÃä5$•Dò#Â÷6ÖÆÃà¢Æƒ#ã#U4ECÂöƒ#à¢Ç7G&öæsà¢C"ãSãÆVÓçf—'GVÆW3ÂöVÓà¢Â÷7G&öæsà¢Çà¢FöFò7&—Fò ¢Æ'"óà¢,:7F–62–Æ–Ö—FF0¢Æ'"óà¢&V–æ–6–òÖVç7VÀ¢Â÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WE–ÖVçEÆâ‚&7'—Fõó#"“°¢6WE–ÖVçDÖWF†öB‚&—'FÒ"“°¢×Ğ¢à¢v"÷"—'FĞ¢Âö'WGFöãà¢Âö'F–6ÆSà¢ÂöF—cà¢·–ÖVçDÖWF†öBÓÓÒ'""bb€¢ÆF—b6Æ74æÖSÒ'–ÖVçBÖfÆ÷r"ÖfÆ÷ræVÂ#à¢Æ–Öp¢7&3Ò"÷"Ö&æ6òÖvæFW&òæ§r"ÆöF–æsÒ&Æ§’"FV6öF–æsÒ&7–æ2"v–GFƒ×³s#Ò†V–v‡C×³#Ğ¢ÇCÒ%"–öÆòvòFR&æ6òvæFW&ò&v"VÂÆâVâ&öÆ—f– ¢óà¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#åtòTâ$ôÄ•d”ÂöF—cà¢Æƒ3äW66æVVÂ"6öâGR&æ6óÂöƒ3à¢Çà¢&VæVf–6–&–ó¢Æ#äæVÇ6öâÖVæF÷¦F÷'&W3Âö#à¢Â÷à¢Çà¢&VÂÆâFRU4Bv²"'Ğ¢Æ#ä'2¶&ÇVRæöff–6–ÂçFôf—†VBƒ"—ÓÂö#âÂ6Æ7VÆFò6öâÆ¢&VfW&Væ6–Ö÷7G&FVâ7&—FõVÇ6òà¢Â÷à¢Çà¢wV&FVÂ6ö×&ö&çFS¢VÂFÖ–æ—7G&F÷"FV&RfW&–f–6&ÆòçFW0¢FR†&–Æ—F"GRÆâà¢Â÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WE–ÖVçDÖWF†öB†çVÆÂ“°¢6WEf–Wr‚'–ÖVçB"“°¢×Ğ¢à¢–w\:’+r6öÆ–6—F"fW&–f–66œ;6à¢Âö'WGFöãà¢ÂöF—cà¢ÂöF—cà¢—Ğ¢·–ÖVçDÖWF†öBÓÓÒ&—'FÒ"bb€¢ÆF—b6Æ74æÖSÒ'–ÖVçBÖfÆ÷r—'FÒÖfÆ÷ræVÂ#à¢ÆF—b6Æ74æÖSÒ&—'FÒÖÖ&²#äÂöF—cà¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#åtò”åDU$ä4”ôäÃÂöF—cà¢Æƒ3åvÖVF–çFR—'FÓÂöƒ3à¢Çà¢7VVçFFR6ö'&ó¢Æ#æ—'FÒæÖRöæVÇ6öæÃ¶ÆöF‡3cÂö#à¢Â÷à¢Çà¢'&R—'FÒÂ&VÆ—¦VÂvò6÷'&W7öæF–VçFRÂÆâ’6öç6W'f¢VÂ6ö×&ö&çFR&ÆfW&–f–66œ;6âà¢Â÷à¢Æ¢6Æ74æÖSÒ'–ÖVçBÖÆ–æ² ¢‡&VcÒ&‡GG3¢òö—'FÒæÖRöæVÇ6öæÃ¶ÆöF‡3b ¢F&vWCÒ%ö&Ææ² ¢&VÃÒ&æ÷&VfW'&W" ¢à¢'&—"7VVçF—'FÒ(ip¢Âöà¢Æ'WGFöà¢öä6Æ–6³×²‚’Óâ°¢6WE–ÖVçDÖWF†öB†çVÆÂ“°¢6WEf–Wr‚'–ÖVçB"“°¢×Ğ¢à¢–w\:’+r6öÆ–6—F"fW&–f–66œ;6à¢Âö'WGFöãà¢ÂöF—cà¢ÂöF—cà¢—Ğ¢¶æ÷F–6RbbÆF—b6Æ74æÖSÒ'ÆâÖæ÷F–6R#ç¶æ÷F–6WÓÂöF—cçĞ¢ÆF—b6Æ74æÖSÒ&ÆVvÂÖæ÷FR#à¢VÂ6—FÂf—'GVÂæòW2Væ7&—FöÖöæVFÂæòVVFR&WF—&'6RÀ¢G&ç6fW&—'6Ræ’6öçfW'F—'6RVâF–æW&ò&VÂâÆ2vææ6–26–×VÆF0¢æòvVæW&â&VÖ–÷2ÖöæWF&–÷2âÆ7F—f6œ;6âö7W'&RFW7\:—2FRÆ¢fW&–f–66œ;6âFVÂFÖ–æ—7G&F÷"à¢ÂöF—cà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&FöÆÆ""bb€¢Ç6V7F–öâ6Æ74æÖSÒ'vR7WÆVÖVçFÂÖFF#à¢Æ†VFW"6Æ74æÖSÒ&&öÆ—f–ÖÆ—fRÖ†VB#à¢ÆF—cà¢Ç7â6Æ74æÖSÒ&Æ—fRÖF÷B#î)xòDDõ2$ôÄ•d”+rTâÔõd”Ô”TåDóÂ÷7ãà¢ÆƒåGR:×2ÂÆ“æÜ:2l:6–ÂFRVçFVæFW"ãÂö“ãÂöƒà¢ÇäL;6Æ"ÂVæW&|:ÖÂ6÷7FòfÖ–Æ–"’6öçfW'66œ;6âFRÆ6ö×Væ–FBVâVæ6öÆf—7FãÂ÷à¢ÂöF—cà¢Ç7â6Æ74æÖSÒ&&öÆ—f–ÖfÆr"&–ÖÆ&VÃÒ$&æFW&FR&öÆ—f–#ï	øz	ø{CÂ÷7ãà¢Âö†VFW#à¢Æ'F–6ÆR6Æ74æÖSÒ&&öÆ—f–×f—7VÂÖ&ö&BæVÂ#à¢ÆF—b6Æ74æÖSÒ&&òÖFFÖ6&BW†6†ævRÖ6&B#à¢Ç7â6Æ74æÖSÒ&FFÖ–6öâfÆrÖ–6öâ#ï	øz	ø{CÂ÷7ãà¢ÆF—cãÇ6ÖÆÃåU4Bò$ô"+r$TdU$Tä4”3Â÷6ÖÆÃãÆ#ä'2¶&ÇVRæ'W’çFôf—†VBƒ"—ÒÆVÓî(	CÂöVÓâ'2¶&ÇVRç6VÆÂçFôf—†VBƒ"—ÓÂö#ãÇ7ãä6ö×&’fVçF%+r¶&ÇVRçWFFVGÓÂ÷7ããÂöF—cà¢Ç7â6Æ74æÖSÒ&FFÖ–6öâFöÆÆ"Ö–6öâ#âCÂ÷7ãà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&òÖFFÖ6&B#à¢Ç7â6Æ74æÖSÒ&FFÖ–6öâ#î)»ÓÂ÷7ãà¢ÆF—cãÇ6ÖÆÃä4ôÔ%U5D”$ÄU2$TuTÄDõ3Â÷6ÖÆÃãÆ#äFW6FR'2bÃ“bôÃÂö#ãÇ7ãäv6öÆ–æ+rFœ:—6VÂ+rtÅÂ÷7ããÂöF—cà¢Æ’6Æ74æÖSÒ'6–væÂÖ&'2#ãÇRóãÇRóãÇRóãÇRóãÂö“à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&òÖFFÖ6&B#à¢Ç7â6Æ74æÖSÒ&FFÖ–6öâ&'&VÂÖ–6öâ#î)x“Â÷7ãà¢ÆF—cãÇ6ÖÆÃåUE,94ÄTòuD“Â÷6ÖÆÃãÆ#åU4Bs‚Ã‚ö&'&–ÃÂö#ãÇ7ãäWV—fÆVçFR&VfW&Væ6–ÂU4BÃC’ôÃÂ÷7ããÂöF—cà¢Æ’6Æ74æÖSÒ'F–ç’×G&VæB#î(ÈÂö“à¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&òÖFFÖ6&BfÖ–Ç’Ö6&B#à¢Ç7â6Æ74æÖSÒ&FFÖ–6öâ#ï	ù¹#Â÷7ãà¢ÆF—cãÇ6ÖÆÃäDT4•4”ôäU2dÔ”Ä”$U3Â÷6ÖÆÃãÆ#ä6ö×&çFW2FRFV6–F—#Âö#ãÇ7ãåF—òFR6Ö&–òÂG&ç7÷'FR’VæW&|:ÖÂ÷7ããÂöF—cà¢Æ’6Æ74æÖSÒ'VÇ6R×&–ær"óà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&òÖÖ&¶WB×7G&—#à¢¶FöÆÆ$†—7F÷'’ç6Æ–6R‚Ó‚’æÖ‚‡ö–çBÂ–æFW‚’Óâ€¢Æ’¶W“×·ö–çBæ×Ò7G–ÆS×·¶†V–v‡C¢G³#‚²‚‡ö–çBç'¢2²–æFW‚¢r’Rcb—ÒV×Ò6Æ74æÖS×¶–æFW‚R2ÓÓÒò&fÆÂ"¢"'Òóà¢’—Ğ¢ÆF—cãÆ#ä„•5L95$”4òU4Bô$ô#Âö#ãÇ7ãäVÂW&–öFòFW7F6Fò6Ö&–WFöÜ:F–6ÖVçFSÂ÷7ããÂöF—cà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&&òÖ6öÖ×Væ—G’×7G&—#à¢Ç7ãî)xóÂ÷7ããÆF—cãÆ#ä4ôÕTä”DB5$•DõTÅ4óÂö#ãÇ6ÖÆÃä6öÖVçF&–÷2VGV6F—f÷2’W‡W&–Væ6–2FR÷G&÷2W7V&–÷3Â÷6ÖÆÃãÂöF—cà¢Æ'WGFöâöä6Æ–6³×²‚’Óâ†5–D66W72ò6WEf–Wr‚&6öÖ×Væ—G’"’¢6WEf–Wr‚'Æç2"—Óç¶†5–D66W72ò%fW"6ö×Væ–FB"¢$6öæö6W"66W6ò'ÓÂö'WGFöãà¢ÂöF—cà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'ö–çBÖFFæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äDDõ2DR4DTåDóÂöF—cà¢Æƒ3å6VÆV66–öæVâÖW2FVÂ†—7L;7&–6óÂöƒ3à¢ÆF—b6Æ74æÖSÒ'ö–çB×F'2#à¢¶FöÆÆ$†—7F÷'’æÖ‚†BÂ’’Óâ€¢Æ'WGFöà¢6Æ74æÖS×·6VÆV7FVDFöÆÆ%ö–çBÓÓÒ’ò&7F—fR"¢"'Ğ¢¶W“×¶Bæ×Ğ¢öä6Æ–6³×²‚’Óâ6WE6VÆV7FVDFöÆÆ%ö–çB†’—Ğ¢à¢¶Bæ×Ğ¢Âö'WGFöãà¢’—Ğ¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'6VÆV7FVB×ö–çB#à¢ÆF—cà¢Ç6ÖÆÃåU$”ôDóÂ÷6ÖÆÃà¢Æ#ç¶FöÆÆ$†—7F÷'•·6VÆV7FVDFöÆÆ%ö–çEÒæ×ÓÂö#à¢ÂöF—cà¢ÆF—cà¢Ç6ÖÆÃå$TdU$Tä4””å5D•ET4”ôäÃÂ÷6ÖÆÃà¢Æ#à¢'2¶FöÆÆ$†—7F÷'•·6VÆV7FVDFöÆÆ%ö–çEÒæöff–6–ÂçFôf—†VBƒ"—Ğ¢Âö#à¢ÂöF—cà¢ÆF—cà¢Ç6ÖÆÃå%D”t•DÃÂ÷6ÖÆÃà¢Æ#ä'2¶FöÆÆ$†—7F÷'•·6VÆV7FVDFöÆÆ%ö–çEÒç'çFôf—†VBƒ"—ÓÂö#à¢ÂöF—cà¢ÆF—cà¢Ç6ÖÆÃä%$T4„Â÷6ÖÆÃà¢Æ#à¢²€¢†FöÆÆ$†—7F÷'•·6VÆV7FVDFöÆÆ%ö–çEÒç'ğ¢FöÆÆ$†—7F÷'•·6VÆV7FVDFöÆÆ%ö–çEÒæöff–6–ÂĞ¢’ ¢ ¢’çFôf—†VBƒ—Ğ¢P¢Âö#à¢ÂöF—cà¢ÂöF—cà¢Ç6Æ74æÖSÒ&FFÖ6WF–öâ#à¢Æ6W&–R†—7L;7&–66öçF–ì;¦Ö&6F6öÖòFVÖ÷7G&F—f†7F¢6ö×ÆWF"7RVF—F÷,:ÖFö7VÖVçFÂâæò6RWF–Æ—¦&&V6öÖVæF ¢Væ6ö×&à¢Â÷à¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ&VæW&w’×æVÂæVÂ#à¢ÆF—b6Æ74æÖSÒ'æVÂ×F÷#à¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äTäU$|8Ô’T4ôäôÜ8ÔdÔ”Ä”#ÂöF—cà¢Æƒ3åWG,;6ÆVò’6öÖ'W7F–&ÆW3Âöƒ3à¢ÂöF—cà¢Ç6ÖÆÃå&VfW&Væ6–2+r>(	3’vò##cÂ÷6ÖÆÃà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&ö–ÂÖ6&G2#à¢ÆF—cà¢Ç6ÖÆÃåuD’+r$%$”ÃÂ÷6ÖÆÃà¢Æ#âCs‚ãƒÂö#à¢Ç7ãåU4B÷"S‚Ã“’Æ—G&÷3Â÷7ãà¢ÂöF—cà¢ÆF—cà¢Ç6ÖÆÃåuD’+rUT•dÄTåDSÂ÷6ÖÆÃà¢Æ#âCãC’ôÃÂö#à¢Ç7ãæ7'VFòÂæò6öÖ'W7F–&ÆR&Vf–æFóÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Ç6ÖÆÃä%$TåB+r$%$”ÃÂ÷6ÖÆÃà¢Æ#âCƒ2ãSSÂö#à¢Ç7ãç&VfW&Væ6––çFW&æ6–öæÃÂ÷7ãà¢ÂöF—cà¢ÂöF—cà¢ÆƒCä&öÆ—f–+r&V6–÷2&VwVÆF÷2Ö÷7G&F÷3ÂöƒCà¢ÆF—b6Æ74æÖSÒ&&öÆ—f–ÖgVVÇ2#à¢ÆF—cà¢Æ#äv6öÆ–æW7V6–ÃÂö#à¢Ç7G&öæsä'2bÃ“bôÃÂ÷7G&öæsà¢Ç7ãâG²ƒbã“bò&ÇVRæöff–6–Â’çFôf—†VBƒ"—ÒôÃÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Æ#äFœ:—6VÂö–ÃÂö#à¢Ç7G&öæsä'2’ÃƒôÃÂ÷7G&öæsà¢Ç7ãâG²ƒ’ã‚ò&ÇVRæöff–6–Â’çFôf—†VBƒ"—ÒôÃÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Æ#äv6öÆ–æ&VÖ—VÓÂö#à¢Ç7G&öæsä'2ÃôÃÂ÷7G&öæsà¢Ç7ãâG²ƒò&ÇVRæöff–6–Â’çFôf—†VBƒ"—ÒôÃÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Æ#ätÅFöÖ–6–Æ–&–óÂö#à¢Ç7G&öæsä'2#"ÃSöv'&fÂ÷7G&öæsà¢Ç7ãâG²ƒ#"ãRò&ÇVRæöff–6–Â’çFôf—†VBƒ"—Òò¶sÂ÷7ãà¢ÂöF—cà¢ÂöF—cà¢ÆƒCä6ö×&6œ;6â6öâ:×6W2Æ–Ü:×G&öfW2+rU4B÷"Æ—G&óÂöƒCà¢ÆF—b6Æ74æÖSÒ&gVVÂÖÆVvVæB#à¢Ç7ãäv6öÆ–æÂ÷7ãà¢Ç7ãäFœ:—6VÃÂ÷7ãà¢Ç7ãätÅöWFö|:3Â÷7ãà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'&Vv–öæÂÖ6†'B#à¢·&Vv–öæÄgVVÂæÖ‚‡"’Óâ€¢ÆF—b6Æ74æÖSÒ&6÷VçG'’ÖgVVÂ"¶W“×·"æ6÷VçG'—Óà¢Æ#ç·"æ6÷VçG'—ÓÂö#à¢ÆF—cà¢Æ’7G–ÆS×·²v–GFƒ¢G²‡"æv6öÆ–æRòã‚’¢ÒV×Òóà¢Ç7ãâG·"æv6öÆ–æRçFôf—†VBƒ"—ÓÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Æ’7G–ÆS×·²v–GFƒ¢G²‡"æF–W6VÂòã‚’¢ÒV×Òóà¢Ç7ãâG·"æF–W6VÂçFôf—†VBƒ"—ÓÂ÷7ãà¢ÂöF—cà¢ÆF—cà¢Æ’7G–ÆS×·²v–GFƒ¢G²‡"æÇròã‚’¢ÒV×Òóà¢Ç7ãâG·"æÇrçFôf—†VBƒ"—ÓÂ÷7ãà¢ÂöF—cà¢ÂöF—cà¢’—Ğ¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&fÖ–Ç’Öæ÷FR#à¢Æ#å&FV6—6–öæW2fÖ–Æ–&W3Âö#à¢Çà¢6ö×&VÂv7FòÖVç7VÂFRG&ç7÷'FR’v2ÂW&ò&Wf—6¢6—VFBÂ6Æ–FBFVÂ6öÖ'W7F–&ÆRÂ–×VW7F÷2’fV6†âÆ÷2&V6–÷0¢&Vv–öæÆW26öâ&VfW&Væ6–26VÖæÆW2’VVFVâ6Ö&–"à¢Â÷à¢ÂöF—cà¢Âö'F–6ÆSà¢Â÷6V7F–öãà¢—Ğ¢·f–WrÓÓÒ&FÖ–â"bb—4FÖ–âbb€¢Ç6V7F–öâ6Æ74æÖSÒ'vRFÖ–âÖW‡G&#à¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂFÖ–âÖ–FVçF—G’#à¢ÆF—b6Æ74æÖSÒ&FÖ–â×6V7W&—G’Ö†VB#à¢ÆF—cà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#å4TuU$”DB’44U4óÂöF—cà¢Æƒ#å&W÷'FRFRÆ7VVçFFÖ–æ—7G&F÷&Âöƒ#à¢Çä–æf÷&Ö6œ;6âFR66W6ò’&÷FV66œ;6âFVÂæVÂ&–æ6—ÂãÂ÷à¢ÂöF—cà¢Ç7G&öær6Æ74æÖSÒ'6V7W&—G’×7FGW2#î)xò44U4ò5D•dóÂ÷7G&öæsà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ&FÖ–â×6V7W&—G’Öw&–B#à¢ÆF—cãÇ6ÖÆÃäDÔ”ä•5E$Dõ"$”ä4•ÃÂ÷6ÖÆÃãÆ#äæVÇ6öâÖVæF÷¦F÷'&W3Âö#ãÇ7ãå&W7öç6&ÆRFR&Wf—6"v÷2’†&–Æ—F"ÆæW2ãÂ÷7ããÂöF—cà¢ÆF—cãÇ6ÖÆÃä4õ%$TòDR44U4óÂ÷6ÖÆÃãÆ"6Æ74æÖSÒ'6V7W&—G’ÖVÖ–Â#ææVÆÆVÖVçFôvÖ–Âæ6öÓÂö#ãÇ7ãä7VVçFfW&–f–6FÖVF–çFR7W&6RWF‚ãÂ÷7ããÂöF—cà¢ÆF—cãÇ6ÖÆÃää•dTÂDRU$Ô•4óÂ÷6ÖÆÃãÆ#äFÖ–æ—7G&F÷#Âö#ãÇ7ãåfVçF2Â66W6÷2Âf—6—F2’ÖöFW&6œ;6âãÂ÷7ããÂöF—cà¢ÆF—cãÇ6ÖÆÃäU5DDòDRÄ5TTåDÂ÷6ÖÆÃãÆ"6Æ74æÖSÒ'W#ä7F—f’WF÷&—¦FÂö#ãÇ7ãäVÂæVÂfÆ–FVÂ&öÂçFW2FR6F÷W&6œ;6â&÷FVv–FãÂ÷7ããÂöF—cà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'6V7W&—G’ÖwV–Fæ6R#à¢Æ#å&÷FV66œ;6âFRÆ6öçG&6\;Âö#à¢ÇäÆ6öçG&6\;çVæ66R×VW7G&æ’6RwV&FVâW7F:v–æâWF–Æ—¦Væ6öçG&6\;W†6ÇW6—f&7&—FõVÇ6òÂæòÆ6ö×'F2÷"v†G4’6–W'&Æ6W6œ;6â7VæFòW6W2÷G&òWV—òãÂ÷à¢Æ'WGFöâG—SÒ&'WGFöâ"öä6Æ–6³×·&V6÷fW%77v÷&GÓä6Ö&–"ò&V7WW&"6öçG&6\;Âö'WGFöãà¢ÂöF—cà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ&VÂÖÖWG&–72#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äÜ8•E$”42$TÄU3ÂöF—cà¢Æƒ3åf—6—F2fW&–f–6F3Âöƒ3à¢ÆF—cà¢Ç7ãà¢†÷¢Æ#à¢·f—6—DÖWG&–72çFöF’çFôÆö6ÆU7G&–ær‚&W2Ô$ò"—Òf—6—FçFW2;¦æ–6÷0¢Âö#à¢Â÷7ãà¢Ç7ãà¢9¦ÇF–Ö÷2rL:Ö0¢Æ#à¢·f—6—DÖWG&–72ç6WfVäF—2çFôÆö6ÆU7G&–ær‚&W2Ô$ò"—Òf—6—FçFW2+w²"'Ğ¢·f—6—DÖWG&–72çvUf–Ww2çFôÆö6ÆU7G&–ær‚&W2Ô$ò"—Òf—7F0¢Âö#à¢Â÷7ãà¢Ç7ãà¢:v–æÜ:2f—7FÆ#ç·f—6—DÖWG&–72çF÷vWÓÂö#à¢Â÷7ãà¢ÂöF—cà¢ÆF—b6Æ74æÖSÒ'6V7F–öâÖÖWG&–72#à¢Æ#å6V66–öæW26öç7VÇFF2GW&çFRÆ÷2;¦ÇF–Ö÷2rL:Ö3Âö#à¢´ö&¦V7BæVçG&–W2‡f—6—DÖWG&–72çvW2óò·Ò¢ç6÷'B‚†Â"’Óâ%³ÒÒ³Ò¢æÖ‚…·F‚ÂF÷FÅÒ’Óâ€¢Ç7â¶W“×·F‡Óà¢·F‚ç&WÆ6R‚"ò"Â""’ÇÂ&–æ–6–ò'Ğ¢Ç7G&öæsç·F÷FÇÒf—6—F3Â÷7G&öæsà¢Â÷7ãà¢’—Ğ¢ÂöF—cà¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂf—6—F÷"Ö–çFW&W7BÖÆ—7B#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#ådõ¢DTÂd•4•DåDSÂöF—cà¢Æƒ3ì+õ\:’V–W&VâVæ6öçG&"Vâ7&—FõVÇ6óóÂöƒ3à¢Çà¢&W7VW7F2föÇVçF&–2&V6öv–F2Væ6öÆfW¢÷"F—7÷6—F—fòà¢Â÷à¢¶fVVF&6µ&W7öç6W2æÆVæwF‚ò€¢fVVF&6µ&W7öç6W2æÖ‚‡&W7öç6R’Óâ€¢ÆF—b¶W“×·&W7öç6Ræ–GÓà¢Çî(	Ç·&W7öç6Ræç7vW'Ş(	ÓÂ÷à¢Ç6ÖÆÃà¢6V66œ;6ã¢·&W7öç6Rç6V7F–öçÒ+r·&W7öç6RæFWf–6WÒ+w²"'Ğ¢¶æWrFFR‡&W7öç6Ræ7&VFVEöB’çFôÆö6ÆU7G&–ær‚&W2Ô$ò"—Ğ¢Â÷6ÖÆÃà¢ÂöF—cà¢’¢’¢€¢Ç7ãä;¦âæòW†—7FVâ&W7VW7F2FRf—6—FçFW2ãÂ÷7ãà¢—Ğ¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂÖöFW&F–öâ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äÔôDU$4œ94âDR4ôÔTåD$”õ3ÂöF—cà¢Æƒ3ä6öÆFR&Wf—6œ;6ãÂöƒ3à¢¶æ÷F–6RbbÆF—b6Æ74æÖSÒ'ÆâÖæ÷F–6R#ç¶æ÷F–6WÓÂöF—cçĞ¢¶6öÖÖVçG2æÖ‚†2’Óâ€¢ÆF—`¢¶W“×¶2æ–Bóò2ææÖWĞ¢6Æ74æÖS×°¢2ç7FGW2ÓÓÒ'&Wf–WvVB ¢ò&6öÖÖVçB×&Wf–WvVB ¢¢2ç7FGW2ÓÓÒ&†–FFVâ ¢ò&6öÖÖVçBÖ†–FFVâ ¢¢" ¢Ğ¢à¢Ç7ãà¢Æ#ç¶2ææÖWÓÂö#à¢Ç6ÖÆÃà¢¶2æ76WGÒ+r¶2æ&FvWĞ¢Â÷6ÖÆÃà¢Â÷7ãà¢Çç¶2çFW‡GÓÂ÷à¢Æ'WGFöà¢öä6Æ–6³×²‚’Óà¢ÖöFW&FT6öÖÖVçB€¢2æ–BÀ¢2ç7FGW2ÓÓÒ&†–FFVâ"ò'&W7F÷&R"¢&†–FR"À¢¢Ğ¢à¢¶2ç7FGW2ÓÓÒ&†–FFVâ"ò%&W7FW&""¢$ö7VÇF"'Ğ¢Âö'WGFöãà¢Æ'WGFöà¢F—6&ÆVC×¶2ç7FGW2ÓÓÒ'&Wf–WvVB'Ğ¢öä6Æ–6³×²‚’ÓâÖöFW&FT6öÖÖVçB†2æ–BÂ'&Wf–Wr"—Ğ¢à¢¶2ç7FGW2ÓÓÒ'&Wf–WvVB"ò%&Wf—6Fò)É2"¢$Ö&6"&Wf—6Fò'Ğ¢Âö'WGFöãà¢ÂöF—cà¢’—Ğ¢Âö'F–6ÆSà¢Æ'F–6ÆR6Æ74æÖSÒ'æVÂ&6¶WBÖÖöFW&F–öâ#à¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#å$T4”õ2DRÄ4ôÕTä”DCÂöF—cãÆƒ3å&W÷'FW2VæF–VçFW2FR6æ7FfÖ–Æ–#Âöƒ3à¢¶FÖ–ä&6¶WE&W÷'G2æf–ÇFW"‚‡"’Óâ"ç7FGW2ÓÓÒ'VæF–ær"’æÆVæwF‚òFÖ–ä&6¶WE&W÷'G2æf–ÇFW"‚‡"’Óâ"ç7FGW2ÓÓÒ'VæF–ær"’æÖ‚‡&W÷'B’ÓâÆF—b¶W“×·&W÷'Bæ–GÓãÇ7ããÆ#ç·&W÷'Bç&öGV7GÒ+r'2´çVÖ&W"‡&W÷'Bç&–6R’çFôf—†VBƒ"—Ò÷·&W÷'BçVæ—GÓÂö#ãÇ6ÖÆÃç·&W÷'BæÖ&¶WGÒÂ·&W÷'Bæ6—G—Ò+r·&W÷'BæFW'FÖVçGÒ+r¶æWrFFR‡&W÷'BçW&6†6VEööâ’çFôÆö6ÆTFFU7G&–ær‚&W2Ô$ò"—ÓÂ÷6ÖÆÃãÂ÷7ããÆ'WGFöâöä6Æ–6³×²‚’Óâ&Wf–Wt&6¶WE&–6R‡&W÷'Bæ–BÂ&&÷fR"—Óä&ö&#Âö'WGFöããÆ'WGFöâ6Æ74æÖSÒ&FævW"Ö7F–öâ"öä6Æ–6³×²‚’Óâ&Wf–Wt&6¶WE&–6R‡&W÷'Bæ–BÂ'&V¦V7B"—Óå&V6†¦#Âö'WGFöããÂöF—câ’¢ÇäæòW†—7FVâ&V6–÷2VæF–VçFW2FR&Wf—6œ;6âãÂ÷çĞ¢Âö'F–6ÆSà¢Â÷6V7F–öãà¢—Ğ¢·6†÷tfVVF&6²bbWF…W6W"bb€¢ÆF—b6Æ74æÖSÒ&fVVF&6²Ö÷fW&Æ’"&öÆSÒ&F–Æör"&–ÖÖöFÃÒ'G'VR#à¢Æf÷&Ò6Æ74æÖSÒ&fVVF&6²Ö6&BæVÂ"öå7V&Ö—C×·7V&Ö—DfVVF&6·Óà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢6Æ74æÖSÒ&fVVF&6²Ö6Æ÷6R ¢&–ÖÆ&VÃÒ$6W'&"&VwVçF ¢öä6Æ–6³×²‚’Óâ°¢6W76–öå7F÷&vRç6WD—FVÒ‚&7&—F÷VÇ6òÖfVVF&6²×6VVâ"Â'–W2"“°¢6WE6†÷tfVVF&6²†fÇ6R“°¢×Ğ¢à¢9p¢Âö'WGFöãà¢ÆF—b6Æ74æÖSÒ'æVÂÖÆ&VÂ#äœ9¤Däõ2ÔT¤õ$#ÂöF—cà¢Æƒ#ì+õ\:’FRwW7F,:Ö6&W"VâW7F:v–æóÂöƒ#à¢ÇFW‡F&V¢WFôfö7W0¢&WV—&V@¢Ö–äÆVæwFƒ×³7Ğ¢Ö„ÆVæwFƒ×³SĞ¢fÇVS×¶fVVF&6µFW‡GĞ¢öä6†ævS×²†WfVçB’Óâ6WDfVVF&6µFW‡B†WfVçBçF&vWBçfÇVR—Ğ¢Æ6V†öÆFW#Ò%÷"V¦V×Æó¢<;6ÖòV×W¦"Â\:’ÖöæVFW7GVF–"ò<;6Öò6öçG&öÆ"VÂ&–W6vş(
b ¢óà¢¶fVVF&6µ7FGW2bbÇç¶fVVF&6µ7FGW7ÓÂ÷çĞ¢Æ'WGFöâ6Æ74æÖSÒ&fVVF&6²×6VæB#äVçf–"&W7VW7FÂö'WGFöãà¢Ç6ÖÆÃà¢æòæV6W6—F2W67&–&—"GRæöÖ'&RÂFVÌ:–föæòæ’–æf÷&Ö6œ;6â&—fFà¢Â÷6ÖÆÃà¢Âöf÷&Óà¢ÂöF—cà¢—Ğ¢Æfö÷FW#à¢ÆF—b6Æ74æÖSÒ&'&æB#à¢Ç7ãî)x“Â÷7ãä5$•DóÆ#åTÅ4óÂö#à¢ÂöF—cà¢ÇäFF÷2VGV6F—f÷2&6ö×&VæFW"VÂÖW&6Fòâæòög&V6VÖ÷26W6÷&Ö–VçFòf–ææ6–W&òãÂ÷à¢Ææb6Æ74æÖSÒ&fö÷FW"ÖÆ–æ·2"&–ÖÆ&VÃÒ$–æf÷&Ö6œ;6âFVÂ6—F–ò#à¢Æ‡&VcÒ"öwV–2#äw\:Ö3ÂöãÆ‡&VcÒ"öæ÷6÷G&÷2#äæ÷6÷G&÷3ÂöãÆ‡&VcÒ"öÖWFöFöÆöv–#äÖWFöFöÆö|:ÖÂöãÆ‡&VcÒ"÷&—f6–FB#å&—f6–FCÂöãÆ‡&VcÒ"ö6öçF7Fò#ä6öçF7FóÂöà¢Âöæcà¢Ç7ãì*’##b7&—FõVÇ6óÂ÷7ãà¢Âöfö÷FW#à¢ÂöÖ–ãà¢“°§Ğ 