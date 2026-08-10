"use client";

import { useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";

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
};

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
    name: "Lucía Quant",
    badge: "Analista destacada",
    asset: "BTC",
    text: "La señal mejoró cuando el volumen confirmó la ruptura. Practicaría con una posición pequeña y un límite de pérdida.",
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
    badge: "Comentario útil",
    asset: "ETH",
    text: "La tendencia es alcista, pero esperaría el cierre de la vela antes de entrar para evitar una falsa ruptura.",
    useful: 29,
    score: 4.6,
  },
];
const regionalFuel = [
  { country: "Bolivia", gasoline: 0.59, diesel: 0.81, lpg: 0.19 },
  { country: "Brasil", gasoline: 1.17, diesel: 1.29, lpg: 0.78 },
  { country: "Paraguay", gasoline: 1.1, diesel: 1.34, lpg: 0.72 },
  { country: "Argentina", gasoline: 1.36, diesel: 1.51, lpg: 0.52 },
  { country: "Perú", gasoline: 1.2, diesel: 1.78, lpg: 0.63 },
  { country: "Chile", gasoline: 1.59, diesel: 1.31, lpg: 0.73 },
];

const academyModules = [
  {
    id: "fundamentos",
    number: "01",
    title: "Fundamentos cripto",
    summary: "Comprende blockchain, Bitcoin, wallets y seguridad desde cero.",
    lessons: [
      { title: "Qué es una criptomoneda", content: "Una criptomoneda es un activo digital registrado en una red distribuida. Aprende la diferencia entre moneda, token, precio, utilidad y capitalización.", practice: "Compara Bitcoin, Ether y USDT e identifica para qué se utiliza cada uno." },
      { title: "Cómo funciona blockchain", content: "Los movimientos se agrupan en bloques enlazados y validados por una red. La trazabilidad no significa que toda red sea segura o que su precio vaya a subir.", practice: "Ubica una transacción pública en un explorador y reconoce red, comisión y confirmaciones." },
      { title: "Wallets y claves", content: "La wallet administra claves; la red conserva los activos. La frase semilla y la clave privada nunca deben compartirse ni guardarse en capturas de pantalla.", practice: "Clasifica ejemplos entre wallet custodial, no custodial, caliente y fría." },
      { title: "Stablecoins y redes", content: "Una stablecoin busca mantener una referencia, pero conserva riesgos de emisor, reserva, red y liquidez. Enviar por una red incorrecta puede causar pérdidas.", practice: "Simula un envío de USDT e identifica activo, red, dirección y comisión antes de confirmar." },
    ],
  },
  {
    id: "mercado",
    number: "02",
    title: "Leer el mercado",
    summary: "Interpreta velas, tendencias, soportes y resistencias.",
    lessons: [
      { title: "Anatomía de una vela", content: "Apertura, cierre, máximo y mínimo resumen el movimiento de un periodo. El cuerpo muestra dirección y las mechas reflejan rechazo o volatilidad.", practice: "Identifica una vela alcista, una bajista y una de indecisión en el gráfico." },
      { title: "Temporalidades", content: "Una señal puede ser alcista en 15 minutos y bajista en un día. Primero se observa el marco mayor y luego se busca una entrada en el menor.", practice: "Compara el mismo activo en 1H, 4H y 1D y anota qué cambia." },
      { title: "Tendencia y estructura", content: "Máximos y mínimos ascendentes forman una tendencia alcista; descendentes, una bajista. Un movimiento lateral requiere reglas distintas.", practice: "Marca los últimos tres máximos y mínimos y clasifica la estructura." },
      { title: "Soporte y resistencia", content: "Son zonas donde el precio reaccionó, no líneas exactas. Una ruptura necesita confirmación de cierre y, preferentemente, volumen.", practice: "Dibuja dos zonas y define qué invalidaría tu lectura." },
    ],
  },
  {
    id: "indicadores",
    number: "03",
    title: "Indicadores técnicos",
    summary: "Usa RSI, MACD, medias móviles y volumen sin depender de uno solo.",
    lessons: [
      { title: "RSI", content: "El RSI mide impulso. Sobrecompra o sobreventa no son órdenes automáticas: una tendencia fuerte puede mantener valores extremos.", practice: "Compara el RSI con la estructura del precio antes de decidir." },
      { title: "Medias móviles", content: "Suavizan el precio y ayudan a observar dirección. Son indicadores retrasados y funcionan peor en mercados laterales.", practice: "Observa si el precio está sobre o debajo de las medias y busca confirmación." },
      { title: "MACD", content: "Muestra relación entre medias e impulso mediante cruces e histograma. Los cruces tardíos deben analizarse junto con precio y volumen.", practice: "Encuentra un cruce que funcionó y otro que produjo una señal falsa." },
      { title: "Volumen y confluencia", content: "El volumen ayuda a validar interés. Confluencia significa que estructura, nivel, impulso y riesgo apoyan una misma hipótesis.", practice: "Construye una lista de cuatro confirmaciones antes de practicar una entrada." },
    ],
  },
  {
    id: "riesgo",
    number: "04",
    title: "Gestión de riesgo",
    summary: "Protege el capital con límites, tamaño de posición y disciplina.",
    lessons: [
      { title: "Riesgo por operación", content: "Define cuánto aceptarías perder antes de entrar. Una referencia educativa conservadora suele ser una fracción pequeña del capital, no una apuesta total.", practice: "Calcula el monto de riesgo para tres tamaños de cuenta virtual." },
      { title: "Stop loss e invalidación", content: "El stop se ubica donde la idea deja de ser válida, no donde la pérdida resulta cómoda. Después se calcula el tamaño de la posición.", practice: "Define entrada, invalidación y pérdida máxima antes de comprar." },
      { title: "Relación riesgo/beneficio", content: "Compara la pérdida posible con la ganancia objetivo. Una buena relación no garantiza éxito si la probabilidad es baja.", practice: "Evalúa tres escenarios y descarta los que no compensan el riesgo." },
      { title: "Diario y disciplina", content: "Registrar motivo, emoción, entrada, salida y resultado permite detectar errores repetidos. No se persigue una pérdida con una operación impulsiva.", practice: "Completa una ficha antes y después de una práctica en el simulador." },
    ],
  },
  {
    id: "simulacion",
    number: "05",
    title: "Simulación guiada",
    summary: "Convierte el análisis en un plan medible usando dinero virtual.",
    lessons: [
      { title: "Preparar una hipótesis", content: "Una hipótesis incluye dirección, razones, punto de entrada, invalidación y objetivo. Debe poder demostrarse equivocada.", practice: "Redacta tu hipótesis en una sola frase antes de operar." },
      { title: "Ejecutar sin improvisar", content: "La entrada se realiza solo si se cumplen las condiciones. Cambiar las reglas durante la operación impide evaluar el método.", practice: "Realiza una compra virtual respetando el límite de pérdida configurado." },
      { title: "Cerrar y medir", content: "Una operación se evalúa por cumplimiento del plan, no solo por dinero ganado. Una buena decisión también puede terminar en pérdida.", practice: "Cierra una posición y registra resultado financiero y calidad de ejecución." },
      { title: "Revisión de 10 operaciones", content: "Una sola práctica no demuestra una estrategia. Agrupa resultados, tasa de acierto, ganancia media, pérdida media y errores.", practice: "Completa diez prácticas y escribe una mejora concreta para la siguiente serie." },
    ],
  },
  {
    id: "estafas",
    number: "06",
    title: "Evitar estafas",
    summary: "Reconoce promesas falsas y protege tus cuentas y dispositivos.",
    lessons: [
      { title: "Promesas y urgencia", content: "Rentabilidad garantizada, presión para depositar y supuestos expertos que escriben por privado son alertas frecuentes.", practice: "Marca las señales de alarma en tres ofertas ficticias." },
      { title: "Phishing y aplicaciones falsas", content: "Verifica dominio, aplicación y remitente. Nunca ingreses una frase semilla desde un enlace recibido por mensaje.", practice: "Revisa una URL de ejemplo y detecta cambios de letras o dominios extraños." },
      { title: "Seguridad de cuenta", content: "Usa contraseña única, gestor de contraseñas y autenticación de dos factores con aplicación cuando sea posible.", practice: "Completa una lista de seguridad para correo, exchange y wallet." },
      { title: "Qué hacer ante un incidente", content: "Detén transferencias, cambia credenciales desde un equipo seguro, revoca sesiones y documenta direcciones y transacciones para reportar.", practice: "Ordena los pasos de respuesta ante una cuenta comprometida." },
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
    "El término criptomoneda reúne activos digitales muy diferentes. Bitcoin fue diseñado como una red monetaria sin una autoridad central; Ether sirve además para pagar operaciones en Ethereum; USDT busca seguir el valor del dólar. Una moneda pertenece a su propia red, mientras que un token suele funcionar sobre una red existente. El precio es lo que el mercado paga en un momento, la capitalización aproxima precio por unidades circulantes y el volumen muestra cuánto se negoció. Ninguno de esos datos, por separado, demuestra que un proyecto sea útil, seguro o una buena compra. Antes de considerar un activo revisa su propósito, emisión, liquidez, equipo, riesgos y dónde se negocia.",
    "Una blockchain es un registro compartido entre muchos participantes. Las transacciones válidas se agrupan en bloques y cada bloque contiene una referencia criptográfica al anterior, haciendo visible una alteración. En prueba de trabajo, los mineros compiten usando cómputo; en prueba de participación, validadores bloquean activos y siguen reglas de consenso. Las confirmaciones reducen la probabilidad de reversión, pero no corrigen una dirección equivocada ni garantizan recuperar fondos. Un explorador permite consultar identificador, dirección, importe, comisión, bloque y estado. La transparencia del registro tampoco garantiza que el token o contrato sea legítimo: solo confirma lo ocurrido en esa red.",
    "Una wallet no guarda monedas como una carpeta; administra claves que permiten autorizar movimientos registrados en la red. En una plataforma custodial, la empresa controla las claves y el usuario depende de ella. En una wallet no custodial, el usuario controla la frase semilla y también asume toda la responsabilidad. Las wallets calientes están conectadas a internet y son prácticas; las frías mantienen las claves fuera de línea y reducen ciertos ataques. La frase semilla debe escribirse fuera de internet, conservarse en un lugar privado y jamás compartirse. Quien la obtiene puede mover los activos sin pedir permiso. Antes de recibir fondos, verifica red, dirección y una transferencia pequeña de prueba.",
    "Las stablecoins intentan conservar una referencia estable, normalmente un dólar, pero no son idénticas al dinero de un banco central. Pueden depender de reservas, garantías cripto o mecanismos algorítmicos; por ello existen riesgos de emisor, congelamiento, pérdida de paridad y regulación. Además, un mismo símbolo como USDT circula en varias redes. La dirección, la red de origen y la red de destino deben ser compatibles. Las comisiones y tiempos cambian entre Ethereum, Tron, BNB Chain y otras redes. Antes de enviar, confirma activo, red, dirección completa, memo o etiqueta cuando corresponda, importe y comisión. Una operación blockchain normalmente no puede cancelarse.",
  ],
  mercado: [
    "Una vela representa el comportamiento del precio durante un periodo definido. Registra apertura, máximo, mínimo y cierre. Si el cierre supera la apertura, el cuerpo suele mostrarse alcista; si queda debajo, bajista. Las mechas señalan precios visitados que no se mantuvieron hasta el cierre. Una mecha larga puede sugerir rechazo, pero su significado depende de la tendencia, el volumen y la zona donde aparece. Una sola vela no predice el futuro. Para interpretarla compara las velas anteriores, observa si aparece en soporte o resistencia y espera el cierre del periodo. Analizar una vela todavía abierta puede llevar a conclusiones que desaparecen segundos después.",
    "La temporalidad determina cuánta información resume cada vela. En 15 minutos se observan movimientos rápidos y mucho ruido; en cuatro horas o un día aparece una estructura más amplia. Un activo puede subir dentro de una corrección de tendencia bajista, por eso conviene comenzar por el marco mayor y después buscar precisión en uno menor. La temporalidad también debe coincidir con el horizonte de la práctica: una decisión de varios días no debería depender únicamente de una vela de un minuto. Cambiar de marco solo para encontrar una señal que confirme lo que deseas es un sesgo. Define antes qué temporalidades utilizarás y mantén la misma regla al evaluar resultados.",
    "La tendencia se estudia observando secuencias de máximos y mínimos. Máximos y mínimos ascendentes muestran dominio comprador; descendentes, dominio vendedor. Si el precio oscila sin progresar, existe un rango y las estrategias de tendencia pierden precisión. Una ruptura de estructura ocurre cuando se supera un punto relevante, preferentemente con cierre y participación. No todo movimiento contrario cambia la tendencia: puede ser un retroceso normal. Distinguir impulso y corrección evita entrar tarde. Marca en el gráfico puntos evidentes, no cada fluctuación pequeña, y define qué nivel invalidaría tu lectura. La estructura describe lo que el precio hizo; no promete lo que hará después.",
    "Soporte y resistencia son zonas donde compradores o vendedores reaccionaron anteriormente. No deben trazarse como números perfectos porque el mercado suele penetrarlas antes de decidir. Una zona gana relevancia por cantidad de reacciones, temporalidad y movimiento posterior, aunque demasiadas pruebas pueden debilitarla. Cuando una resistencia se rompe puede actuar como soporte, pero el cambio requiere confirmación. Las falsas rupturas ocurren cuando el precio atraviesa una zona y regresa rápidamente. Para reducir errores, espera cierre, revisa volumen y define invalidación. Una entrada siempre debe incluir un escenario alternativo: si el nivel no se sostiene, la idea queda descartada y no se modifica el plan para evitar aceptar la pérdida.",
  ],
  indicadores: [
    "El RSI compara la magnitud de movimientos recientes y suele expresarse entre 0 y 100. Valores altos muestran impulso comprador y valores bajos impulso vendedor, pero 70 y 30 no son botones automáticos de venta o compra. En tendencias fuertes el RSI puede permanecer extremo durante bastante tiempo. También pueden observarse divergencias, cuando precio e indicador avanzan de manera distinta, aunque una divergencia puede tardar en resolverse. Úsalo como confirmación de estructura, no como motivo único. Pregunta primero dónde está el precio, qué tendencia domina y qué riesgo aceptarías. Después utiliza el RSI para evaluar si el impulso acompaña o se debilita.",
    "Una media móvil calcula el promedio de precios de una cantidad determinada de periodos. La media simple asigna el mismo peso a todos; la exponencial da mayor importancia a datos recientes. Su inclinación ayuda a visualizar dirección y puede funcionar como referencia dinámica, pero siempre reacciona después del precio. Los cruces entre medias son claros visualmente y, al mismo tiempo, pueden llegar cuando gran parte del movimiento ya ocurrió. En rangos producen múltiples señales falsas. No existe un periodo universalmente correcto: debe mantenerse constante durante la evaluación. Combina medias con estructura, zonas y volumen, evitando acumular varias medias que entregan esencialmente la misma información.",
    "El MACD se construye con la diferencia entre medias exponenciales, una línea de señal y un histograma. Un cruce puede mostrar cambio de impulso; el histograma permite observar si esa diferencia aumenta o disminuye. Estar sobre cero suele acompañar una fase positiva y estar debajo una negativa, pero no garantiza continuidad. Como deriva del precio, también es retrasado y puede fallar en movimientos laterales. Una lectura útil compara dirección del precio, posición respecto a una zona y comportamiento del histograma. Si estructura y volumen contradicen el cruce, la señal pierde calidad. Evalúa siempre varios ejemplos, incluyendo fallos, antes de incorporar el MACD a una regla de práctica.",
    "El volumen aproxima la participación detrás de un movimiento. Una ruptura acompañada por aumento de volumen suele tener más interés que otra con actividad débil, aunque el volumen disponible puede variar según plataforma y mercado. La confluencia aparece cuando elementos diferentes apoyan una misma hipótesis: por ejemplo, tendencia, soporte, vela de confirmación y volumen. Usar RSI, MACD y varias medias no siempre es verdadera confluencia porque todos provienen del precio. Selecciona evidencias que midan aspectos distintos y evita exigir tantas condiciones que nunca puedas actuar. Antes de practicar, escribe qué señales deben cumplirse, dónde queda invalidada la idea y cuál será el riesgo máximo.",
  ],
  riesgo: [
    "La primera decisión no es cuánto ganar, sino cuánto estás dispuesto a perder si la hipótesis falla. El riesgo por operación debe ser una porción pequeña y previamente definida del capital virtual. Arriesgar una cantidad constante permite sobrevivir a una serie de pérdidas y comparar prácticas. El tamaño de posición depende de la distancia entre entrada y stop: cuanto más lejano sea el stop, menor debe ser la posición para conservar el mismo riesgo. Concentrar todo en una moneda aumenta la exposición a un solo evento. Diversificar tampoco significa comprar muchos activos correlacionados. En CriptoPulso usa el límite de pérdida antes de operar y nunca aumentes el riesgo para recuperar rápidamente.",
    "El stop loss es el punto donde la razón técnica de la operación deja de ser válida. No se coloca al azar ni se aleja después de entrar para evitar una pérdida. Primero se identifica la invalidación; después se calcula el tamaño que mantiene la pérdida máxima aceptada. Un stop demasiado cercano puede activarse por ruido normal, mientras uno lejano exige una posición menor. También existen deslizamiento y movimientos bruscos, por lo que un stop no garantiza ejecución exacta en mercados reales. En la práctica virtual registra entrada, stop, objetivo y tamaño antes de comprar. Si no puedes explicar por qué el nivel invalida tu lectura, aún no existe un plan completo.",
    "La relación riesgo/beneficio compara la pérdida prevista con la ganancia objetivo. Si arriesgas 10 para buscar 20, la relación es 1 a 2. Esto no significa que ganarás dos veces lo arriesgado: el precio puede alcanzar el stop y la probabilidad importa. Una estrategia con menor tasa de acierto puede ser viable si sus ganancias medias superan claramente sus pérdidas, mientras una alta tasa de acierto puede ocultar pérdidas ocasionales enormes. El objetivo debe basarse en estructura y zonas posibles, no en el número que deseas ganar. Antes de entrar calcula ambos escenarios y descarta operaciones cuyo beneficio potencial no compense el riesgo y la incertidumbre.",
    "El diario convierte experiencias aisladas en información. Registra fecha, activo, temporalidad, hipótesis, captura, entrada, stop, objetivo, tamaño, emoción, salida y resultado. Añade si respetaste las reglas, porque una operación ganadora ejecutada impulsivamente sigue siendo un error de proceso. Revisa grupos de al menos diez prácticas para identificar tasa de acierto, ganancia media, pérdida media y fallos repetidos. Después modifica una sola regla y vuelve a probarla; cambiar todo impide saber qué mejoró. La disciplina incluye dejar de operar cuando alcanzas el límite diario, no perseguir pérdidas y aceptar que quedarse fuera también es una decisión válida.",
  ],
  simulacion: [
    "Una hipótesis de operación debe ser específica y falsable. Incluye activo, dirección, temporalidad, estructura observada, confirmaciones, entrada, invalidación y objetivo. Decir “creo que subirá” no permite evaluar nada; decir “si cierra sobre resistencia con volumen, practicaré una compra y saldré si vuelve bajo la zona” sí establece condiciones. La hipótesis se escribe antes de ver el resultado para evitar justificar después cualquier movimiento. También debe contemplar no operar si falta una condición. Usa las señales de CriptoPulso como punto de análisis, no como orden automática, y contrástalas con el gráfico y tu límite de riesgo.",
    "Ejecutar significa seguir las condiciones planificadas. Si el precio se aleja de la entrada, no se persigue por miedo a perder la oportunidad; se espera otra configuración. Después de abrir, no se amplía el stop ni se aumenta la posición sin una regla previamente probada. El tamaño y el límite de pérdida deben configurarse antes de pulsar comprar. Las emociones más comunes son miedo, euforia, impaciencia y deseo de recuperar; anótalas sin juzgarte. El objetivo de la simulación no es producir una cifra espectacular, sino aprender un proceso repetible. Una operación omitida por no cumplir condiciones demuestra disciplina, no fracaso.",
    "Al cerrar una posición se mide resultado y calidad de ejecución. Ganar no convierte automáticamente la decisión en buena, porque una entrada sin plan puede beneficiarse del azar. Del mismo modo, una pérdida controlada puede ser una operación correctamente ejecutada. Compara precio de entrada y salida, comisiones hipotéticas, duración y riesgo asumido. Clasifica la práctica: plan respetado, error de análisis o error de ejecución. Luego escribe una observación concreta, como esperar el cierre de vela o reducir tamaño. Evita modificar inmediatamente la estrategia por una sola pérdida. El aprendizaje surge de revisar patrones repetidos con criterios iguales.",
    "Una serie de diez operaciones permite calcular métricas básicas. La tasa de acierto es ganadoras dividido entre total; la ganancia media y pérdida media muestran la magnitud típica; la expectativa combina frecuencia y tamaño de resultados. También registra la caída máxima del capital y cuántas reglas incumpliste. Diez prácticas siguen siendo una muestra pequeña, pero son mejores que juzgar por un caso. Separa resultados por moneda y temporalidad para no mezclar contextos diferentes. Al terminar, conserva lo que funcionó, selecciona un solo ajuste y prueba otra serie. El dinero virtual permite repetir este ciclo sin arriesgar patrimonio real.",
  ],
  estafas: [
    "Las estafas suelen combinar una promesa atractiva con urgencia y autoridad aparente. Rentabilidad fija, cero riesgo, bonos por depositar hoy, capturas de ganancias y supuestos asesores que escriben en privado son señales de alerta. Un logotipo conocido o muchos seguidores no prueban legitimidad. Investiga dominio, antigüedad, responsables, condiciones de retiro y advertencias independientes. Nunca envíes dinero para “liberar” una ganancia ni aceptes instalar programas de acceso remoto. Las recomendaciones de CriptoPulso son educativas y no solicitan entregar fondos para invertir en tu nombre. Si una oferta impide hacer preguntas o verificar información, aléjate.",
    "El phishing imita páginas, correos y aplicaciones para robar credenciales. Una letra cambiada, subdominio engañoso o enlace acortado puede dirigir a un sitio falso idéntico al original. Accede escribiendo la dirección o usando un marcador verificado; revisa el dominio completo antes de iniciar sesión. Las tiendas de aplicaciones también pueden contener copias, por lo que debes confirmar desarrollador y sitio oficial. Ningún soporte legítimo necesita tu frase semilla. Tampoco la escribas en formularios, enlaces, chats o supuestas herramientas de recuperación. Ante un mensaje urgente, detente y verifica mediante un canal distinto antes de realizar cualquier acción.",
    "La seguridad depende de varias capas. Utiliza una contraseña larga y única para correo, plataforma y exchange; un gestor evita reutilizarlas. Activa autenticación de dos factores con aplicación o llave física cuando esté disponible, conserva códigos de recuperación fuera de línea y protege especialmente el correo porque permite restablecer otras cuentas. Mantén sistema y navegador actualizados, bloquea el dispositivo y evita operar desde redes o equipos desconocidos. Revisa sesiones activas, direcciones autorizadas y notificaciones. Para montos relevantes, separa una wallet de uso frecuente de otra de resguardo. Ninguna medida elimina todo riesgo, pero varias capas reducen la posibilidad de una pérdida total.",
    "Si sospechas un incidente, actúa con orden. Desde un dispositivo seguro cambia primero la contraseña del correo y luego las cuentas vinculadas; revoca sesiones, claves API y aplicaciones desconocidas. Si la frase semilla pudo filtrarse, crea una wallet segura y mueve los fondos restantes sin volver a utilizar la comprometida. Contacta a la plataforma desde su sitio oficial y documenta horarios, direcciones, identificadores de transacción, mensajes y capturas para reportar. No pagues a personas que prometen recuperar fondos garantizadamente: existe una segunda estafa dirigida a víctimas. Después revisa cómo ocurrió el acceso y corrige la causa antes de volver a operar.",
  ],
};

const moduleQuizzes: Record<string, QuizQuestion[]> = {
  fundamentos: [
    { statement: "Una capitalización alta garantiza que una criptomoneda sea segura.", answer: false, explanation: "La capitalización describe tamaño aproximado, no seguridad ni calidad." },
    { statement: "Una blockchain permite consultar transacciones mediante exploradores.", answer: true, explanation: "Los exploradores muestran datos públicos de la red y sus confirmaciones." },
    { statement: "Quien obtiene tu frase semilla puede controlar los activos de esa wallet.", answer: true, explanation: "La frase permite reconstruir las claves; nunca debe compartirse." },
    { statement: "Para enviar USDT basta con que el símbolo sea igual, sin revisar la red.", answer: false, explanation: "Origen y destino deben utilizar una red compatible." },
  ],
  mercado: [
    { statement: "Una vela todavía abierta puede cambiar antes de cerrar.", answer: true, explanation: "Máximo, mínimo y cierre continúan variando durante el periodo." },
    { statement: "La tendencia debe analizarse en una sola temporalidad elegida después de entrar.", answer: false, explanation: "Las temporalidades se definen antes y se inicia por el contexto mayor." },
    { statement: "Máximos y mínimos ascendentes suelen describir una estructura alcista.", answer: true, explanation: "Esa secuencia refleja progreso comprador mientras no sea invalidada." },
    { statement: "Soporte y resistencia son precios exactos que nunca se atraviesan.", answer: false, explanation: "Son zonas y pueden existir penetraciones o falsas rupturas." },
  ],
  indicadores: [
    { statement: "Un RSI sobre 70 obliga a vender inmediatamente.", answer: false, explanation: "Mide impulso y puede permanecer extremo en tendencias fuertes." },
    { statement: "Las medias móviles reaccionan después del precio.", answer: true, explanation: "Se calculan con precios anteriores y, por ello, son retrasadas." },
    { statement: "El MACD debe combinarse con estructura y volumen.", answer: true, explanation: "Un cruce aislado puede producir señales falsas." },
    { statement: "Usar muchos indicadores derivados del precio siempre crea confluencia independiente.", answer: false, explanation: "Pueden repetir la misma información bajo fórmulas distintas." },
  ],
  riesgo: [
    { statement: "El tamaño de posición debe ajustarse a la distancia del stop.", answer: true, explanation: "Así se mantiene constante la pérdida máxima prevista." },
    { statement: "Conviene alejar el stop después de entrar para no aceptar una pérdida.", answer: false, explanation: "Eso aumenta el riesgo y rompe la invalidación planificada." },
    { statement: "Una relación 1 a 2 garantiza que la operación será ganadora.", answer: false, explanation: "Solo compara pérdida y beneficio posibles; no asegura probabilidad." },
    { statement: "Una operación ganadora puede estar mal ejecutada si incumplió el plan.", answer: true, explanation: "El proceso debe evaluarse además del resultado." },
  ],
  simulacion: [
    { statement: "Una hipótesis útil debe incluir cuándo queda invalidada.", answer: true, explanation: "Debe poder demostrarse equivocada y limitar el riesgo." },
    { statement: "Si el precio se aleja, es correcto perseguirlo para no perder la oportunidad.", answer: false, explanation: "Se espera otra configuración si ya no se cumple la entrada." },
    { statement: "Una pérdida controlada puede provenir de una buena decisión.", answer: true, explanation: "El mercado es incierto; importa respetar un proceso sólido." },
    { statement: "Una sola operación basta para demostrar que una estrategia funciona.", answer: false, explanation: "Se necesitan series comparables y métricas repetidas." },
  ],
  estafas: [
    { statement: "La rentabilidad garantizada y sin riesgo es una señal de alerta.", answer: true, explanation: "Ninguna inversión legítima elimina el riesgo." },
    { statement: "El soporte técnico puede solicitar tu frase semilla para verificar la cuenta.", answer: false, explanation: "La frase semilla nunca debe entregarse a ninguna persona." },
    { statement: "Una contraseña única y autenticación de dos factores mejoran la protección.", answer: true, explanation: "Son capas diferentes que reducen accesos no autorizados." },
    { statement: "Después de un robo conviene pagar a quien garantice recuperar los fondos.", answer: false, explanation: "Las falsas recuperaciones son una estafa frecuente contra víctimas." },
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
        <span>VELA EN FORMACIÓN</span>
        <i>
          <u style={{ width: `${progress}%` }} />
        </i>
        <b>{Math.max(0, Math.ceil(seconds * (1 - progress / 100)))}s</b>
      </div>
      <svg
        className="candle-chart"
        viewBox="0 0 820 320"
        preserveAspectRatio="none"
        aria-label={`Gráfico dinámico de velas de ${coin.name}`}
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
  const [amount, setAmount] = useState("1000");
  const [notice, setNotice] = useState("");
  const [tradeLog, setTradeLog] = useState<TradeLog[]>([]);
  const [comment, setComment] = useState("");
  const [commentAsset, setCommentAsset] = useState("BTC");
  const [comments, setComments] = useState<CommunityComment[]>(communitySeed);
  const [visitMetrics, setVisitMetrics] = useState<VisitMetrics>({
    today: 0,
    sevenDays: 0,
    pageViews: 0,
    topPage: "/",
    devices: {},
  });
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [pulseInfo, setPulseInfo] = useState(false);
  const [search, setSearch] = useState("");
  const [stopLoss, setStopLoss] = useState("5");
  const [practiceCoins, setPracticeCoins] = useState<string[]>(["bitcoin"]);
  const [selectedDollarPoint, setSelectedDollarPoint] = useState(
    dollarHistory.length - 1,
  );
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "airtm" | null>(
    null,
  );
  const [paymentPlan, setPaymentPlan] = useState<
    "basic_bo" | "crypto_10" | "crypto_20"
  >("basic_bo");
  const [requestStatus, setRequestStatus] = useState("");
  const [adminRequests, setAdminRequests] = useState<PaymentRequest[]>([]);
  const [manualAccess, setManualAccess] = useState<{
    email: string;
    password: string;
    whatsapp?: string;
  } | null>(null);
  const [openCourse, setOpenCourse] = useState("fundamentos");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, boolean>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>(
    {},
  );
  const visibleCoins = hasPaidAccess ? coins : coins.slice(0, 5);
  const coin = visibleCoins.find((c) => c.id === selected) ?? visibleCoins[0];
  const loadAccess = async (user: User | null) => {
    setAuthUser(user);
    if (!user) {
      setIsAdmin(false);
      setHasPaidAccess(false);
      return false;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .single();
    const paid = data?.status === "active";
    const allowed = data?.role === "admin" && paid;
    setIsAdmin(allowed);
    setHasPaidAccess(paid);
    return allowed;
  };
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => loadAccess(data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => loadAccess(session?.user ?? null), 0);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage("");
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authEmail.trim(),
      password: authPassword,
    });
    if (error) {
      setAuthMessage(
        "No se pudo iniciar sesión. Revisa el correo y la contraseña.",
      );
      setAuthLoading(false);
      return;
    }
    const admin = await loadAccess(data.user);
    setAuthPassword("");
    setAuthLoading(false);
    if (admin) {
      setView("admin");
      setAuthMessage("");
    } else {
      setView("market");
      setNotice(
        "Sesión iniciada. Tu cuenta no tiene permisos de administrador.",
      );
    }
  };
  const signOut = async () => {
    await supabase.auth.signOut();
    setAuthUser(null);
    setIsAdmin(false);
    setHasPaidAccess(false);
    setView("market");
  };
  const recoverPassword = async () => {
    if (!authEmail.trim()) {
      setAuthMessage("Escribe primero tu correo electrónico.");
      return;
    }
    setAuthLoading(true);
    await supabase.auth.resetPasswordForEmail(authEmail.trim(), {
      redirectTo: `${window.location.origin}/auth/activate`,
    });
    setAuthMessage(
      "Si tu cuenta está activa, recibirás un enlace para crear una contraseña nueva. Revisa también spam.",
    );
    setAuthLoading(false);
  };
  const loadPaymentRequests = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch("/api/admin/payment-requests", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (response.ok) {
      const body = await response.json();
      setAdminRequests(body.requests ?? []);
    }
  };
  useEffect(() => {
    if (isAdmin) loadPaymentRequests();
  }, [isAdmin]);
  const reviewPayment = async (
    id: string,
    action: "approve" | "reject" | "manual",
  ) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch("/api/admin/payment-requests", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, action }),
    });
    const body = await response.json();
    if (response.ok && action === "manual")
      setManualAccess({
        email: body.email,
        password: body.temporaryPassword,
        whatsapp: body.whatsapp,
      });
    setNotice(
      response.ok
        ? (body.message ??
            (action === "approve"
              ? "Pago aprobado e invitación enviada."
              : action === "manual"
                ? "Acceso manual creado."
                : "Solicitud rechazada."))
        : (body.error ?? "No se pudo procesar."),
    );
    if (response.ok) loadPaymentRequests();
  };
  const submitPaymentRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const receipt = formData.get("receipt");
    if (receipt instanceof File && receipt.type.startsWith("image/") && receipt.size > 900_000) {
      setRequestStatus("Optimizando la foto del comprobante…");
      try {
        const bitmap = await createImageBitmap(receipt);
        const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const optimized = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.78),
        );
        bitmap.close();
        if (optimized && optimized.size < receipt.size)
          formData.set(
            "receipt",
            new File([optimized], "comprobante-optimizado.jpg", {
              type: "image/jpeg",
            }),
          );
      } catch {
        // If this browser cannot optimize the image, upload the original file.
      }
    }
    setRequestStatus("Enviando solicitud…");
    const response = await fetch("/api/payment-requests", {
      method: "POST",
      body: formData,
    });
    const body = await response.json();
    if (!response.ok) {
      setRequestStatus(body.error ?? "No se pudo enviar.");
      return;
    }
    form.reset();
    setRequestStatus(
      "Solicitud recibida. Revisaremos el pago y enviaremos la invitación a tu correo.",
    );
  };
  const normalizeComments = (rows: any[]): CommunityComment[] =>
    rows.map((r) => ({
      id: r.id,
      name: r.author_name,
      badge: r.badge,
      asset: r.asset,
      text: r.body,
      useful: r.useful_count,
      score: Number(r.score ?? 0),
      status: r.status,
    }));
  const loadComments = async (admin = false) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const response = await fetch(
      admin ? "/api/admin/comments" : "/api/comments",
      admin && session
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : undefined,
    );
    if (response.ok) {
      const body = await response.json();
      setComments(normalizeComments(body.comments ?? []));
    }
  };
  const publishComment = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      setNotice("Inicia sesión con una cuenta activa para comentar.");
      setView("login");
      return;
    }
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ asset: commentAsset, body: comment }),
    });
    const body = await response.json();
    if (!response.ok) {
      setNotice(body.error ?? "No se pudo publicar.");
      return;
    }
    setComment("");
    await loadComments();
  };
  const moderateComment = async (
    id: string | undefined,
    action: "review" | "hide" | "restore",
  ) => {
    if (!id) return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;
    const response = await fetch("/api/admin/comments", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ id, action }),
    });
    const body = await response.json();
    setNotice(
      response.ok
        ? action === "review"
          ? "Comentario marcado como revisado."
          : action === "hide"
            ? "Comentario ocultado."
            : "Comentario restaurado."
        : (body.error ?? "No se pudo actualizar."),
    );
    if (response.ok) await loadComments(true);
  };
  const loadMetrics = async () => {
    const response = await fetch("/api/visits", { cache: "no-store" });
    if (response.ok) setVisitMetrics(await response.json());
  };
  useEffect(() => {
    loadComments();
    loadMetrics();
    const visitorId =
      localStorage.getItem("criptopulso-visitor") ?? crypto.randomUUID();
    localStorage.setItem("criptopulso-visitor", visitorId);
    let sessionId = sessionStorage.getItem("criptopulso-session");
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem("criptopulso-session", sessionId);
    }
    const width = window.innerWidth;
    const device = width < 600 ? "mobile" : width < 1000 ? "tablet" : "desktop";
    fetch("/api/visits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId,
        sessionId,
        path: location.pathname,
        device,
      }),
    })
      .then(() => loadMetrics())
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (isAdmin) {
      loadComments(true);
      loadMetrics();
    }
  }, [isAdmin]);
  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=30&page=1&sparkline=false&price_change_percentage=24h",
    )
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setCoins(
          rows
            .filter((n: any) => n.current_price != null)
            .map((n: any) => {
              const change = Number(n.price_change_percentage_24h ?? 0);
              const signal =
                change >= 3
                  ? "COMPRA FUERTE"
                  : change >= 0.5
                    ? "COMPRA"
                    : change <= -3
                      ? "VENTA"
                      : change <= -0.5
                        ? "VENTA"
                        : "ESPERAR";
              const confidence = Math.min(
                90,
                Math.round(58 + Math.abs(change) * 4),
              );
              return {
                id: n.id,
                symbol: String(n.symbol).toUpperCase(),
                name: n.name,
                price: Number(n.current_price),
                change,
                cap: compact(Number(n.market_cap ?? 0)),
                volume: compact(Number(n.total_volume ?? 0)),
                signal,
                confidence,
              };
            }),
        );
      })
      .catch(() => {});
    fetch("https://bo.dolarapi.com/v1/dolares/binance")
      .then((r) => r.json())
      .then((b) => {
        if (b.compra > 5 && b.compra < 25 && b.venta > 5 && b.venta < 25)
          setBlue((old) => ({
            ...old,
            buy: b.compra,
            sell: b.venta,
            updated: new Date(b.fechaActualizacion).toLocaleString("es-BO"),
          }));
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    const saved = localStorage.getItem("criptopulso-demo");
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setCash(s.cash ?? 10000);
        setHoldings(s.holdings ?? []);
        setTradeLog(s.tradeLog ?? []);
        setPracticeCoins(s.practiceCoins ?? ["bitcoin"]);
      } catch {}
    }
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "criptopulso-demo",
      JSON.stringify({ cash, holdings, tradeLog, practiceCoins }),
    );
  }, [cash, holdings, tradeLog, practiceCoins]);
  const currentFor = (symbol: string) =>
    symbol === coin.symbol
      ? livePrice
      : (coins.find((c) => c.symbol === symbol)?.price ?? 0);
  const portfolio = holdings.reduce(
    (s, h) => s + h.amount * (currentFor(h.symbol) || h.avg),
    cash,
  );
  const trade = (side: "buy" | "sell") => {
    const usd = Number(amount);
    const execution = livePrice || coin.price;
    if (!usd || usd <= 0) return setNotice("Ingresa un monto válido.");
    if (side === "buy") {
      if (usd > cash) return setNotice("Capital virtual insuficiente.");
      if (!practiceCoins.includes(coin.id))
        return setNotice("Añade primero esta moneda a tus prácticas.");
      const qty = usd / execution;
      const sl = Math.min(50, Math.max(0.1, Number(stopLoss) || 5));
      setCash((v) => v - usd);
      setHoldings((h) => {
        const old = h.find((x) => x.symbol === coin.symbol);
        return old
          ? h.map((x) =>
              x.symbol === coin.symbol
                ? {
                    ...x,
                    amount: x.amount + qty,
                    avg: (x.avg * x.amount + usd) / (x.amount + qty),
                    stopLoss: sl,
                  }
                : x,
            )
          : [
              ...h,
              {
                symbol: coin.symbol,
                amount: qty,
                avg: execution,
                stopLoss: sl,
              },
            ];
      });
      setTradeLog((l) => [
        {
          id: Date.now(),
          side: "Compra",
          symbol: coin.symbol,
          entry: execution,
          usd,
          result: 0,
        },
        ...l,
      ]);
      setNotice(
        `Entrada registrada a ${fmt(execution)} con límite de pérdida de ${sl}%.`,
      );
    } else {
      const owned = holdings.find((h) => h.symbol === coin.symbol);
      if (!owned) return setNotice(`No tienes ${coin.symbol} para vender.`);
      const qty = Math.min(owned.amount, usd / execution);
      const cost = qty * owned.avg,
        proceeds = qty * execution,
        result = proceeds - cost;
      setCash((v) => v + proceeds);
      setHoldings((h) =>
        h
          .map((x) =>
            x.symbol === coin.symbol ? { ...x, amount: x.amount - qty } : x,
          )
          .filter((x) => x.amount > 0.0000001),
      );
      setTradeLog((l) => [
        {
          id: Date.now(),
          side: "Venta",
          symbol: coin.symbol,
          entry: owned.avg,
          exit: execution,
          usd: proceeds,
          result,
        },
        ...l,
      ]);
      setNotice(
        `${result >= 0 ? "Ganaste" : "Perdiste"} ${fmt(Math.abs(result))} (${((result / cost) * 100).toFixed(2)}%) al cerrar esta operación.`,
      );
    }
  };
  const addPractice = (id: string) => {
    if (practiceCoins.includes(id)) {
      setSelected(id);
      setView("simulator");
      return;
    }
    if (practiceCoins.length >= 3) {
      setNotice("Puedes practicar un máximo de 3 monedas por dispositivo.");
      setView("simulator");
      return;
    }
    setPracticeCoins((p) => [...p, id]);
    setSelected(id);
    setView("simulator");
    setNotice("Moneda añadida a tus prácticas de este dispositivo.");
  };
  const practice = () => addPractice(coin.id);
  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("market")}>
          <span>◉</span>CRIPTO<b>PULSO</b>
        </button>
        <nav>
          {[
            ["market", "Mercado"],
            ["simulator", "Simulador"],
            ["dollar", "Dólar BO"],
            ["community", "Comunidad"],
            ["academy", "Academia"],
            ["plans", "Planes"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => {
                if (!hasPaidAccess && ["dollar", "community"].includes(id)) {
                  setNotice("Esta sección forma parte del acceso pagado.");
                  setView("plans");
                  return;
                }
                setView(id as typeof view);
              }}
            >
              {label}
              {!hasPaidAccess && ["dollar", "community"].includes(id)
                ? " 🔒"
                : ""}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="ghost"
            onClick={() => setView(isAdmin ? "admin" : "login")}
          >
            {authUser
              ? isAdmin
                ? "Panel administrador"
                : hasPaidAccess
                  ? "Mi cuenta completa"
                  : "Mi sesión"
              : "Iniciar sesión"}
          </button>
          {authUser && (
            <button className="ghost logout-header" onClick={signOut}>
              Cerrar sesión
            </button>
          )}
          <button className="cta" onClick={() => setView("plans")}>
            Comenzar práctica
          </button>
        </div>
      </header>
      <div className="ticker">
        {visibleCoins.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              setSelected(c.id);
              setView("market");
            }}
          >
            <b>{c.symbol}</b> {fmt(c.price)}{" "}
            <em className={c.change >= 0 ? "up" : "down"}>
              {c.change >= 0 ? "+" : ""}
              {c.change.toFixed(2)}%
            </em>
          </button>
        ))}
      </div>
      {view === "market" && (
        <div className="terminal">
          <div className={`access-level ${hasPaidAccess ? "paid" : "free"}`}>
            <b>{hasPaidAccess ? "ACCESO COMPLETO ACTIVO" : "VISTA GRATUITA"}</b>
            <span>
              {hasPaidAccess
                ? "Todas las monedas, análisis, cursos y prácticas disponibles."
                : "Puedes consultar 5 monedas y una introducción. Activa un plan para abrir todo el contenido."}
            </span>
            {!hasPaidAccess && (
              <button onClick={() => setView("plans")}>Ver planes</button>
            )}
          </div>
          <section className="market-head">
            <div>
              <span className="live-dot">● MERCADO EN VIVO</span>
              <h1>
                El mercado, <i>explicado.</i>
              </h1>
              <p>
                Analiza señales, comprende el riesgo y practica sin utilizar
                dinero real.
              </p>
            </div>
            <button
              className="market-score"
              onClick={() => setPulseInfo((v) => !v)}
            >
              <small>PULSO GLOBAL · ¿QUÉ ES?</small>
              <strong>68</strong>
              <span>Optimismo moderado</span>
            </button>
          </section>
          {pulseInfo && (
            <div className="pulse-explanation panel">
              <b>¿Qué significa 68?</b>
              <p>
                Es un resumen educativo de 0 a 100 que combina cambio de
                precios, volumen, impulso y cantidad de monedas con tendencia
                positiva. De 0–39 indica cautela, 40–59 equilibrio, 60–79
                optimismo moderado y 80–100 euforia. No es una orden de compra
                ni garantiza resultados.
              </p>
            </div>
          )}
          <section className="dashboard-grid">
            <article className="chart-panel panel">
              <div className="panel-top">
                <div className="coin-title">
                  <span className="coin-icon">{coin.symbol[0]}</span>
                  <div>
                    <small>{coin.name} / USD</small>
                    <b className="live-price">{fmt(livePrice)}</b>
                  </div>
                  <em className={coin.change >= 0 ? "up" : "down"}>
                    {coin.change >= 0 ? "▲" : "▼"}{" "}
                    {Math.abs(coin.change).toFixed(2)}%
                  </em>
                </div>
                <div className="chart-controls">
                  <label>
                    NUEVA VELA
                    <select
                      value={candleSeconds}
                      onChange={(e) => setCandleSeconds(Number(e.target.value))}
                    >
                      <option value="10">10 s</option>
                      <option value="30">30 s</option>
                      <option value="60">1 min</option>
                      <option value="300">5 min</option>
                    </select>
                  </label>
                  <div className="ranges">
                    {["1H", "4H", "1D", "7D", "30D"].map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={range === r ? "active" : ""}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <CandleChart
                coin={coin}
                range={range}
                seconds={candleSeconds}
                onPrice={setLivePrice}
              />
              <div className="chart-stats">
                <span>
                  APERTURA <b>{fmt(coin.price * 0.982)}</b>
                </span>
                <span>
                  MÁXIMO <b>{fmt(coin.price * 1.023)}</b>
                </span>
                <span>
                  MÍNIMO <b>{fmt(coin.price * 0.971)}</b>
                </span>
                <span>
                  VOLUMEN <b>{coin.volume}</b>
                </span>
              </div>
              <div className="chart-data-note">
                La cotización base proviene del mercado. El movimiento entre
                actualizaciones es una simulación educativa acelerada para
                practicar.
              </div>
            </article>
            <aside className="signal-panel panel">
              <div className="panel-label">SEÑAL EDUCATIVA</div>
              <div
                className={`signal-badge ${coin.signal.includes("VENTA") ? "sell" : coin.signal === "ESPERAR" ? "wait" : ""}`}
              >
                {coin.signal}
              </div>
              <div className="confidence">
                <span>Confianza del modelo</span>
                <b>{coin.confidence}%</b>
                <i>
                  <u style={{ width: `${coin.confidence}%` }} />
                </i>
              </div>
              <div className="indicators">
                <p>
                  <span>RSI (14)</span>
                  <b>
                    58.4 <em>Neutral</em>
                  </b>
                </p>
                <p>
                  <span>MACD</span>
                  <b>
                    +142 <em className="up">Alcista</em>
                  </b>
                </p>
                <p>
                  <span>Media móvil</span>
                  <b>
                    Por encima <em className="up">Positivo</em>
                  </b>
                </p>
                <p>
                  <span>Volumen</span>
                  <b>
                    +18.6% <em className="up">Creciente</em>
                  </b>
                </p>
              </div>
              <div className="signal-explain">
                <b>¿Por qué esta señal?</b>
                <p>
                  El impulso y el volumen muestran fortaleza, pero la
                  volatilidad continúa elevada. La señal puede cambiar con
                  nuevos datos.
                </p>
              </div>
              <button className="practice" onClick={practice}>
                Practicar esta señal →
              </button>
              <small className="disclaimer">
                Análisis educativo. No constituye asesoramiento financiero ni
                garantiza resultados.
              </small>
            </aside>
            <article className="dollar-panel panel">
              <div className="panel-top">
                <div>
                  <div className="panel-label">DÓLAR EN BOLIVIA</div>
                  <h3>USD / BOB</h3>
                </div>
                <button onClick={() => setView("dollar")}>
                  Ver histórico →
                </button>
              </div>
              <div className="rates">
                <div className="official primary-rate">
                  <small>REFERENCIA MOSTRADA POR BCB</small>
                  <b>Bs {blue.official.toFixed(2)}</b>
                  <em>Dato configurado · verificar vigencia</em>
                </div>
                <div>
                  <small>P2P USDT/BOB · COMPRA</small>
                  <b>Bs {blue.buy.toFixed(2)}</b>
                  <em>Mercado digital</em>
                </div>
                <div>
                  <small>P2P USDT/BOB · VENTA</small>
                  <b>Bs {blue.sell.toFixed(2)}</b>
                  <em>{blue.updated}</em>
                </div>
              </div>
              <div className="rate-warning">
                El P2P de USDT es una referencia digital distinta del dólar
                oficial y del billete físico.
              </div>
            </article>
            <article className="trends-panel panel">
              <div className="panel-top">
                <div>
                  <div className="panel-label">RADAR DE TENDENCIAS</div>
                  <h3>Oportunidades observadas</h3>
                </div>
                <button
                  onClick={() =>
                    hasPaidAccess
                      ? setShowAllTrends((v) => !v)
                      : setView("plans")
                  }
                >
                  {hasPaidAccess
                    ? showAllTrends
                      ? "Ver destacadas"
                      : "Ver todas las monedas"
                    : "Desbloquear todas"} →
                </button>
              </div>
              <p className="radar-help">
                Ordena activos por fuerza de señal y confianza. Abre una moneda
                para ver por qué aparece.
              </p>
              {visibleCoins
                .slice(0, showAllTrends ? visibleCoins.length : 4)
                .map((c) => (
                <button
                  className="trend-row"
                  key={c.id}
                  onClick={() => {
                    setSelected(c.id);
                    setShowAllTrends(true);
                  }}
                >
                  <span className="coin-icon small">{c.symbol[0]}</span>
                  <span>
                    <b>{c.name}</b>
                    <small>{c.symbol} · 4H</small>
                  </span>
                  <i className={`mini-bars ${c.change < 0 ? "negative" : ""}`}>
                    {[1, 3, 2, 5, 4, 7, 6].map((h, i) => (
                      <u key={i} style={{ height: `${h * 4}px` }} />
                    ))}
                  </i>
                  <em
                    className={
                      c.signal.includes("VENTA")
                        ? "down"
                        : c.signal === "ESPERAR"
                          ? "wait-color"
                          : "up"
                    }
                  >
                    {c.signal}
                  </em>
                  <strong>{c.confidence}%</strong>
                </button>
                ))}
            </article>
          </section>
          <section className="coin-table panel">
            <div className="panel-top">
              <div>
                <div className="panel-label">MERCADO</div>
                <h3>
                  {hasPaidAccess
                    ? "Todas las criptomonedas disponibles"
                    : "5 criptomonedas en la vista gratuita"}
                </h3>
              </div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar moneda o símbolo…"
              />
            </div>
            <div className="table-head">
              <span>ACTIVO</span>
              <span>PRECIO</span>
              <span>24H</span>
              <span>CAP. MERCADO</span>
              <span>VOLUMEN</span>
              <span>SEÑAL</span>
            </div>
            {visibleCoins
              .filter((c) =>
                (c.name + c.symbol)
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((c) => (
                <button
                  className="table-row"
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                >
                  <span>
                    <i className="coin-icon small">{c.symbol[0]}</i>
                    <b>
                      {c.name}
                      <small>{c.symbol}</small>
                    </b>
                  </span>
                  <strong>{fmt(c.price)}</strong>
                  <em className={c.change >= 0 ? "up" : "down"}>
                    {c.change >= 0 ? "+" : ""}
                    {c.change.toFixed(2)}%
                  </em>
                  <span>{c.cap}</span>
                  <span>{c.volume}</span>
                  <u
                    className={
                      c.signal.includes("VENTA")
                        ? "sell-tag"
                        : c.signal === "ESPERAR"
                          ? "wait-tag"
                          : "buy-tag"
                    }
                  >
                    {c.signal}
                  </u>
                </button>
              ))}
          </section>
          {!hasPaidAccess && (
            <article className="premium-gate panel">
              <span>ACCESO COMPLETO</span>
              <h2>Continúa con el análisis completo del mercado</h2>
              <p>
                Desbloquea todas las monedas, señales explicadas, indicadores,
                academia completa y prácticas avanzadas después de verificar
                tu pago.
              </p>
              <button onClick={() => setView("plans")}>Comparar planes</button>
            </article>
          )}
          <div className="public-traffic panel">
            <span>◉ COMUNIDAD EN CRECIMIENTO</span>
            <b>
              {visitMetrics.today.toLocaleString("es-BO")} visitantes hoy ·{" "}
              {visitMetrics.sevenDays.toLocaleString("es-BO")} en 7 días
            </b>
            <small>
              {visitMetrics.pageViews.toLocaleString("es-BO")} páginas vistas
              reales. Una persona se cuenta una vez por dispositivo.
            </small>
          </div>
          <div className="ad-space">
            <small>ESPACIO PUBLICITARIO</small>
            <span>Google AdSense</span>
          </div>
        </div>
      )}
      {view === "simulator" && (
        <section className="risk-control panel">
          <div>
            <small>CONTROL DE RIESGO PARA NUEVAS COMPRAS</small>
            <b>Límite de pérdida</b>
            <p>
              Si el precio cae este porcentaje desde tu entrada, tendrás una
              referencia clara para cerrar la práctica.
            </p>
          </div>
          <label>
            <input
              type="number"
              min="0.1"
              max="50"
              step="0.5"
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
            />
            <span>%</span>
          </label>
          <em>
            Ejemplo: con 5%, una entrada de $1.000 limita la pérdida objetivo a
            aproximadamente $50.
          </em>
        </section>
      )}
      {view === "simulator" && (
        <section className="practice-selector panel">
          <div>
            <b>Mis monedas de práctica</b>
            <span>{practiceCoins.length}/3 en este dispositivo</span>
          </div>
          <div>
            {practiceCoins.map((id) => {
              const c = coins.find((x) => x.id === id)!;
              return (
                <button
                  className={selected === id ? "active" : ""}
                  key={id}
                  onClick={() => setSelected(id)}
                >
                  {c.symbol} · {c.signal}
                  <i
                    onClick={(e) => {
                      e.stopPropagation();
                      if (practiceCoins.length > 1) {
                        setPracticeCoins((p) => p.filter((x) => x !== id));
                        if (selected === id)
                          setSelected(practiceCoins.find((x) => x !== id)!);
                      }
                    }}
                  >
                    ×
                  </i>
                </button>
              );
            })}
            <select
              value=""
              onChange={(e) => e.target.value && addPractice(e.target.value)}
              aria-label="Añadir moneda para practicar"
            >
              <option value="">+ Añadir moneda</option>
              {visibleCoins
                .filter((c) => !practiceCoins.includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.signal}
                  </option>
                ))}
            </select>
          </div>
          <small>
            Máximo tres. Se guardan únicamente en este navegador y dispositivo.
          </small>
        </section>
      )}
      {view === "simulator" && (
        <section className="simulator page">
          <div className="page-title">
            <span>SIMULADOR EDUCATIVO</span>
            <h1>Practica y entiende cada resultado.</h1>
            <p>
              La señal orienta una práctica; tú decides la entrada, observas el
              cambio y cierras la operación.
            </p>
          </div>
          <div className="signal-guide panel">
            <b>Cómo practicar la señal {coin.signal}</b>
            <ol>
              <li>Revisa la razón y su confianza de {coin.confidence}%.</li>
              <li>Elige un monto virtual que puedas controlar.</li>
              <li>
                Compra para abrir una posición; observa precio de entrada y
                precio actual.
              </li>
              <li>
                Vende para cerrar. El sistema calcula exactamente cuánto ganaste
                o perdiste.
              </li>
            </ol>
            <span>
              La señal puede fallar: define un límite de pérdida antes de
              practicar.
            </span>
          </div>
          <div className="sim-grid">
            <article className="sim-chart panel">
              <div className="panel-top">
                <div className="coin-title">
                  <span className="coin-icon">{coin.symbol[0]}</span>
                  <div>
                    <small>{coin.name} / USD · PRÁCTICA</small>
                    <b className="live-price">{fmt(livePrice)}</b>
                  </div>
                </div>
                <div className="chart-controls">
                  <label>
                    NUEVA VELA
                    <select
                      value={candleSeconds}
                      onChange={(e) => setCandleSeconds(Number(e.target.value))}
                    >
                      <option value="10">10 s</option>
                      <option value="30">30 s</option>
                      <option value="60">1 min</option>
                      <option value="300">5 min</option>
                    </select>
                  </label>
                  <button
                    className="change-coin"
                    onClick={() => setView("market")}
                  >
                    Cambiar activo
                  </button>
                </div>
              </div>
              <CandleChart
                coin={coin}
                range={range}
                seconds={candleSeconds}
                onPrice={setLivePrice}
              />
              <div className="simulation-strip">
                <span>
                  SEÑAL <b>{coin.signal}</b>
                </span>
                <span>
                  CONFIANZA <b>{coin.confidence}%</b>
                </span>
                <span>
                  CAPITAL <b>{fmt(portfolio)}</b>
                </span>
                <span className={portfolio >= 10000 ? "up" : "down"}>
                  RESULTADO{" "}
                  <b>
                    {portfolio >= 10000 ? "+" : "-"}
                    {fmt(Math.abs(portfolio - 10000))}
                  </b>
                </span>
              </div>
            </article>
            <article className="portfolio-card panel">
              <small>VALOR DEL PORTAFOLIO</small>
              <h2>{fmt(portfolio)}</h2>
              <div
                className={`pnl-total ${portfolio >= 10000 ? "positive" : "negative"}`}
              >
                <small>GANANCIA / PÉRDIDA TOTAL</small>
                <strong>
                  {portfolio >= 10000 ? "+" : "-"}
                  {fmt(Math.abs(portfolio - 10000))}
                </strong>
                <em>{((portfolio / 10000 - 1) * 100).toFixed(2)}%</em>
              </div>
              <div className="portfolio-meta">
                <span>
                  Disponible <b>{fmt(cash)}</b>
                </span>
                <span>
                  Invertido <b>{fmt(portfolio - cash)}</b>
                </span>
              </div>
              <div className="holdings">
                {holdings.length ? (
                  holdings.map((h) => {
                    const current = currentFor(h.symbol) || h.avg;
                    const result = h.amount * (current - h.avg);
                    return (
                      <div key={h.symbol}>
                        <b>{h.symbol}</b>
                        <span>
                          Entrada {fmt(h.avg)}
                          <small>Actual {fmt(current)}</small>
                        </span>
                        <em className={result >= 0 ? "up" : "down"}>
                          {result >= 0 ? "+" : "-"}
                          {fmt(Math.abs(result))}
                          <small>
                            {((current / h.avg - 1) * 100).toFixed(2)}%
                          </small>
                        </em>
                      </div>
                    );
                  })
                ) : (
                  <p>Aún no tienes posiciones abiertas.</p>
                )}
              </div>
              <button
                className="reset"
                onClick={() => {
                  setCash(10000);
                  setHoldings([]);
                  setTradeLog([]);
                  setNotice("Portafolio de prueba reiniciado.");
                }}
              >
                Reiniciar práctica
              </button>
            </article>
            <article className="trade-card panel">
              <div className="trade-coin">
                <span className="coin-icon">{coin.symbol[0]}</span>
                <div>
                  <small>PRECIO DE EJECUCIÓN</small>
                  <b className="live-price">{fmt(livePrice)}</b>
                </div>
                <button onClick={() => setView("market")}>
                  Cambiar moneda
                </button>
              </div>
              <div className="signal-mini">
                Señal actual <b>{coin.signal}</b>
                <span>{coin.confidence}% de confianza</span>
              </div>
              <label>
                Monto virtual en USD
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <div className="quick">
                {[100, 500, 1000, 5000].map((v) => (
                  <button key={v} onClick={() => setAmount(String(v))}>
                    ${v}
                  </button>
                ))}
              </div>
              <div className="trade-actions">
                <button className="buy" onClick={() => trade("buy")}>
                  COMPRAR {coin.symbol}
                </button>
                <button className="sell-button" onClick={() => trade("sell")}>
                  VENDER {coin.symbol}
                </button>
              </div>
              {notice && <div className="notice">{notice}</div>}
              <small className="disclaimer">
                Operación simulada al precio visible. Los fondos no pueden
                retirarse ni convertirse en dinero real.
              </small>
            </article>
            <article className="trade-history panel">
              <div className="panel-label">HISTORIAL DE RESULTADOS</div>
              <h3>Tus últimas operaciones</h3>
              {tradeLog.length ? (
                tradeLog.map((t) => (
                  <div key={t.id}>
                    <b>
                      {t.side} {t.symbol}
                    </b>
                    <span>
                      Entrada {fmt(t.entry)}{" "}
                      {t.exit && `→ salida ${fmt(t.exit)}`}
                    </span>
                    <em className={t.result >= 0 ? "up" : "down"}>
                      {t.side === "Compra"
                        ? "Posición abierta"
                        : `${t.result >= 0 ? "Ganaste" : "Perdiste"} ${fmt(Math.abs(t.result))}`}
                    </em>
                  </div>
                ))
              ) : (
                <p>
                  Cuando compres o vendas, aquí verás qué ocurrió y tu
                  resultado.
                </p>
              )}
            </article>
          </div>
        </section>
      )}
      {view === "payment" && (
        <section className="page auth-page payment-request-page">
          <form
            className="auth-card panel payment-request-form"
            onSubmit={submitPaymentRequest}
          >
            <div className="panel-label">SOLICITUD DE ACCESO</div>
            <h1>Envía tu comprobante</h1>
            <p>
              Verificaremos el pago antes de enviarte una invitación para crear
              tu contraseña.
            </p>
            <input type="hidden" name="plan" value={paymentPlan} />
            <input
              className="form-trap"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
            />
            <label>
              Nombre completo
              <input name="fullName" required minLength={2} />
            </label>
            <label>
              Correo para la invitación
              <input name="email" type="email" required />
            </label>
            <label>
              WhatsApp con código de país
              <input
                name="whatsapp"
                type="tel"
                autoComplete="tel"
                required
                minLength={7}
                maxLength={30}
                placeholder="Ej.: +591 70000000"
              />
              <small>
                Se utilizará únicamente para enviarte los datos de acceso y
                atender tu solicitud.
              </small>
            </label>
            <label>
              País
              <input
                name="country"
                required
                defaultValue={paymentPlan === "basic_bo" ? "Bolivia" : ""}
              />
            </label>
            <label>
              Plan seleccionado
              <input
                readOnly
                value={
                  paymentPlan === "basic_bo"
                    ? "Básico Bolivia · USD 1"
                    : paymentPlan === "crypto_10"
                      ? "Cripto 10 · 10 USDT"
                      : "Cripto 20 · 20 USDT"
                }
              />
            </label>
            <label>
              Importe exacto pagado y moneda
              <input
                name="paidAmount"
                required
                maxLength={40}
                placeholder="Ej.: Bs 11,86 o 10 USDT"
              />
            </label>
            <label>
              Número o referencia del pago (opcional)
              <input name="reference" maxLength={120} />
            </label>
            <label>
              Comprobante JPG, PNG, WEBP o PDF
              <input
                name="receipt"
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                required
              />
              <small>Las fotos grandes se optimizan antes de enviarse. Máximo 5 MB.</small>
            </label>
            {requestStatus && (
              <div className="plan-notice">{requestStatus}</div>
            )}
            <button className="practice">Enviar para verificación</button>
            <button
              type="button"
              className="auth-logout"
              onClick={() => setView("plans")}
            >
              Volver a planes
            </button>
          </form>
        </section>
      )}
      {view === "dollar" && (
        <section className="page dollar-page">
          <div className="page-title">
            <span>OBSERVATORIO USD / BOB</span>
            <h1>Entiende la evolución del dólar en Bolivia.</h1>
            <p>
              Compara referencias sin confundir el tipo oficial, el P2P digital
              y el efectivo.
            </p>
          </div>
          <div className="dollar-summary">
            <article className="panel">
              <small>REFERENCIA BCB MOSTRADA</small>
              <b>Bs {blue.official.toFixed(2)}</b>
              <span>USD / BOB</span>
            </article>
            <article className="panel">
              <small>P2P DIGITAL · COMPRA</small>
              <b>Bs {blue.buy.toFixed(2)}</b>
              <span>USDT / BOB</span>
            </article>
            <article className="panel">
              <small>P2P DIGITAL · VENTA</small>
              <b>Bs {blue.sell.toFixed(2)}</b>
              <span>{blue.updated}</span>
            </article>
          </div>
          <article className="dollar-history panel">
            <div className="panel-top">
              <div>
                <div className="panel-label">TENDENCIA HISTÓRICA</div>
                <h3>Comparación mensual USD/BOB</h3>
              </div>
              <div className="chart-legend">
                <span className="official-line">● BCB</span>
                <span className="p2p-line">● P2P digital</span>
              </div>
            </div>
            <svg
              viewBox="0 0 920 330"
              preserveAspectRatio="xMidYMid meet"
              aria-label="Gráfico histórico demostrativo del dólar en Bolivia"
            >
              {[14, 12, 10, 8, 6].map((value) => (
                <g key={value}>
                  <line
                    x1="55"
                    x2="905"
                    y1={dollarY(value)}
                    y2={dollarY(value)}
                    className="grid-line"
                  />
                  <text x="46" y={dollarY(value) + 4} className="axis-label">
                    Bs {value}
                  </text>
                </g>
              ))}
              <polyline
                points={dollarHistory
                  .map((d, i) => `${65 + i * 75},${dollarY(d.official)}`)
                  .join(" ")}
                className="history-official"
              />
              <polyline
                points={dollarHistory
                  .map((d, i) => `${65 + i * 75},${dollarY(d.p2p)}`)
                  .join(" ")}
                className="history-p2p"
              />
              {dollarHistory.map((d, i) => (
                <g key={d.m}>
                  <circle
                    cx={65 + i * 75}
                    cy={dollarY(d.official)}
                    r="3.5"
                    className="official-dot"
                  />
                  <circle
                    cx={65 + i * 75}
                    cy={dollarY(d.p2p)}
                    r="4"
                    className="p2p-dot"
                  />
                  <text
                    x={65 + i * 75}
                    y={dollarY(d.p2p) - 9}
                    className="point-value p2p-value"
                  >
                    {d.p2p.toFixed(2)}
                  </text>
                  <text
                    x={65 + i * 75}
                    y={dollarY(d.official) + 14}
                    className="point-value official-value"
                  >
                    {d.official.toFixed(2)}
                  </text>
                  <text x={65 + i * 75} y="318" className="month-label">
                    {d.m}
                  </text>
                </g>
              ))}
            </svg>
            <div className="data-method">
              <b>Importante sobre los datos</b>
              <p>
                La serie mensual mostrada es demostrativa para validar el
                diseño. Antes del lanzamiento comercial conectaremos y
                auditaremos una fuente histórica verificable. Los valores
                actuales se presentan separados por fuente y mercado.
              </p>
            </div>
          </article>
          <div className="dollar-insights">
            <article className="panel">
              <div className="panel-label">CÓMO LEERLO</div>
              <h3>¿Por qué existen diferencias?</h3>
              <p>
                El tipo oficial es una referencia institucional. El P2P refleja
                operaciones digitales entre personas y puede cambiar por
                liquidez, método de pago y plataforma. El efectivo puede tener
                otra cotización.
              </p>
            </article>
            <article className="panel">
              <div className="panel-label">COMUNIDAD</div>
              <h3>¿Qué observan otros usuarios?</h3>
              <p>
                Comenta la tendencia USD/BOB, explica tu razonamiento y recibe
                valoraciones por aportes que ayudaron a otros.
              </p>
              <button className="practice" onClick={() => setView("community")}>
                Ver comentarios del dólar →
              </button>
            </article>
          </div>
        </section>
      )}
      {view === "community" && (
        <section className="page community-page">
          <div className="page-title">
            <span>COMUNIDAD CRIPTOPULSO</span>
            <h1>Aprender también es explicar.</h1>
            <p>
              Los aportes se destacan por claridad y utilidad, no por prometer
              ganancias.
            </p>
          </div>
          <div className="community-layout">
            <article className="comment-form panel">
              <div className="panel-label">COMPARTE TU ANÁLISIS</div>
              <h3>¿Qué tendencia estás observando?</h3>
              <select
                aria-label="Activo del comentario"
                value={commentAsset}
                onChange={(e) => setCommentAsset(e.target.value)}
              >
                <option>{coin.symbol}</option>
                <option>USD/BOB</option>
                {visibleCoins.map((c) => (
                  <option key={c.id} value={c.symbol}>
                    {c.name} · {c.symbol}
                  </option>
                ))}
              </select>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explica qué observas, en qué plazo y qué riesgo considerarías…"
              />
              <button className="practice" onClick={publishComment}>
                Publicar análisis
              </button>
              <small>
                No publiques datos personales ni afirmes que un resultado está
                garantizado.
              </small>
            </article>
            <div className="comment-feed">
              {comments.map((c, i) => (
                <article className="comment-card panel" key={`${c.name}-${i}`}>
                  <div className="comment-author">
                    <span>{c.name[0]}</span>
                    <div>
                      <b>{c.name}</b>
                      <small>{c.badge}</small>
                    </div>
                    <em>{c.asset}</em>
                  </div>
                  <p>{c.text}</p>
                  <div className="comment-actions">
                    <button
                      onClick={() =>
                        setComments((all) =>
                          all.map((x, j) =>
                            j === i ? { ...x, useful: x.useful + 1 } : x,
                          ),
                        )
                      }
                    >
                      ◆ Me sirvió · {c.useful}
                    </button>
                    <span>★ {c.score || "Nuevo"}</span>
                    <button>Seguir analista</button>
                  </div>
                  {c.useful >= 30 && (
                    <div className="expert-note">
                      Aporte muy valorado por la comunidad · sigue compartiendo
                      análisis claros
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}
      {view === "login" && (
        <section className="page auth-page">
          <form className="auth-card panel" onSubmit={signIn}>
            <div className="panel-label">ACCESO SEGURO</div>
            <h1>Iniciar sesión</h1>
            <p>
              Ingresa con la cuenta habilitada por CriptoPulso. La creación
              pública de cuentas permanece cerrada.
            </p>
            <label>
              Correo electrónico
              <input
                type="email"
                autoComplete="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="tu@correo.com"
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                autoComplete="current-password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
              />
            </label>
            {authMessage && <div className="auth-error">{authMessage}</div>}
            <button className="practice" disabled={authLoading}>
              {authLoading ? "Verificando…" : "Entrar"}
            </button>
            <button
              type="button"
              className="auth-logout"
              disabled={authLoading}
              onClick={recoverPassword}
            >
              Olvidé mi contraseña
            </button>
            {authUser && (
              <button type="button" className="auth-logout" onClick={signOut}>
                Cerrar sesión actual
              </button>
            )}
            <small>
              No compartas tu contraseña. CriptoPulso nunca te la solicitará por
              chat.
            </small>
          </form>
        </section>
      )}
      {view === "admin" && isAdmin && (
        <section className="page admin-page">
          <div className="page-title">
            <span>PANEL ADMINISTRADOR</span>
            <h1>Ventas y habilitación de planes.</h1>
            <p>
              Verifica el comprobante antes de habilitar capital virtual al
              usuario.
            </p>
            <button className="auth-logout" onClick={signOut}>
              Cerrar sesión
            </button>
          </div>
          <div className="admin-stats">
            <article className="panel">
              <small>SOLICITUDES PENDIENTES</small>
              <b>
                {adminRequests.filter((r) => r.status === "pending").length}
              </b>
            </article>
            <article className="panel">
              <small>PAGOS VERIFICADOS</small>
              <b>
                {
                  adminRequests.filter(
                    (r) => r.status === "invited" || r.status === "approved",
                  ).length
                }
              </b>
            </article>
            <article className="panel">
              <small>REFERENCIA PARA QR</small>
              <b>Bs {blue.official.toFixed(2)}</b>
              <span>por USD del plan</span>
            </article>
          </div>
          <article className="admin-table panel">
            <div className="panel-top">
              <div>
                <div className="panel-label">SOLICITUDES DE COMPRA</div>
                <h3>Pagos por verificar</h3>
              </div>
              <button>Exportar ventas</button>
            </div>
            {notice && <div className="plan-notice">{notice}</div>}
            {manualAccess && (
              <div className="plan-notice">
                <b>Acceso manual listo · cópialo ahora</b>
                <p>Correo: {manualAccess.email}</p>
                <p>WhatsApp: {manualAccess.whatsapp || "No registrado"}</p>
                <p>Contraseña temporal: <strong>{manualAccess.password}</strong></p>
                <button
                  type="button"
                  onClick={async () => {
                    await navigator.clipboard.writeText(
                      `CriptoPulso\nCorreo: ${manualAccess.email}\nContraseña temporal: ${manualAccess.password}\nIngreso: https://cripto-pulso.vercel.app`,
                    );
                    setNotice("Datos de acceso copiados.");
                  }}
                >
                  Copiar datos para el cliente
                </button>
                <button type="button" onClick={() => setManualAccess(null)}>
                  Ya los guardé
                </button>
              </div>
            )}
            <div className="admin-row admin-head">
              <span>USUARIO</span>
              <span>PLAN</span>
              <span>PAGO</span>
              <span>MÉTODO</span>
              <span>ESTADO</span>
              <span>ACCIÓN</span>
            </div>
            {adminRequests.some((r) => r.status === "pending") ? (
              adminRequests
                .filter((r) => r.status === "pending")
                .map((r) => (
                  <div className="admin-row" key={r.id}>
                    <b>
                      {r.full_name}
                      <small>{r.email}</small>
                      <small>WhatsApp: {r.whatsapp || "No registrado"}</small>
                    </b>
                    <span>
                      {r.plan
                        .replace("basic_bo", "Básico BO")
                        .replace("crypto_10", "Cripto 10")
                        .replace("crypto_20", "Cripto 20")}
                    </span>
                    <span>
                      <b>{r.paid_amount}</b>
                      <small>Plan: {r.amount_label}</small>
                    </span>
                    <span>
                      {r.payment_method === "qr" ? "QR Bolivia" : "Airtm"}
                    </span>
                    <em
                      className={
                        r.status === "invited"
                          ? "up"
                          : r.status === "rejected"
                            ? "down"
                            : "wait-color"
                      }
                    >
                      {r.status === "pending"
                        ? "Pendiente"
                        : r.status === "invited"
                          ? "Invitado"
                          : "Rechazado"}
                    </em>
                    <span className="admin-actions">
                      {r.receipt_url && (
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver comprobante
                        </a>
                      )}
                      <button
                        disabled={r.status !== "pending"}
                        onClick={() => reviewPayment(r.id, "approve")}
                      >
                        Aprobar
                      </button>
                      <button
                        disabled={r.status !== "pending"}
                        onClick={() => reviewPayment(r.id, "manual")}
                      >
                        Acceso manual
                      </button>
                      <button
                        disabled={r.status !== "pending"}
                        onClick={() => reviewPayment(r.id, "reject")}
                      >
                        Rechazar
                      </button>
                    </span>
                  </div>
                ))
            ) : (
              <p>No existen solicitudes de pago todavía.</p>
            )}
          </article>
          <article className="admin-table panel">
            <div className="panel-top">
              <div>
                <div className="panel-label">HISTORIAL</div>
                <h3>Pagos verificados y procesados</h3>
              </div>
            </div>
            <div className="admin-row admin-head">
              <span>USUARIO</span>
              <span>PLAN</span>
              <span>IMPORTE PAGADO</span>
              <span>MÉTODO</span>
              <span>ESTADO</span>
              <span>COMPROBANTE / ACCIÓN</span>
            </div>
            {adminRequests.some((r) => r.status !== "pending") ? (
              adminRequests
                .filter((r) => r.status !== "pending")
                .map((r) => (
                  <div className="admin-row" key={`history-${r.id}`}>
                    <b>
                      {r.full_name}
                      <small>{r.email}</small>
                      <small>WhatsApp: {r.whatsapp || "No registrado"}</small>
                    </b>
                    <span className="admin-actions">
                      {r.plan
                        .replace("basic_bo", "Básico BO")
                        .replace("crypto_10", "Cripto 10")
                        .replace("crypto_20", "Cripto 20")}
                    </span>
                    <span>{r.paid_amount}</span>
                    <span>
                      {r.payment_method === "qr" ? "QR Bolivia" : "Airtm"}
                    </span>
                    <em className={r.status === "rejected" ? "down" : "up"}>
                      {r.status === "rejected"
                        ? "Rechazado"
                        : r.status === "approved"
                          ? "Verificado"
                          : "Invitado"}
                    </em>
                    <span>
                      {r.receipt_url && (
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Ver comprobante
                        </a>
                      )}
                      {r.status === "invited" && (
                        <button onClick={() => reviewPayment(r.id, "manual")}>
                          Acceso manual
                        </button>
                      )}
                    </span>
                  </div>
                ))
            ) : (
              <p>Aún no existen pagos procesados.</p>
            )}
          </article>
          <div className="admin-note panel">
            <b>Métodos de cobro configurados</b>
            <p>
              Bolivia: QR Yolo Pago de Banco Ganadero a nombre de Nelson Mendoza
              Torres. Exterior: Airtm mediante airtm.me/nelsonal1klodhs6. Cada
              aprobación envía una invitación al correo verificado del
              estudiante.
            </p>
          </div>
        </section>
      )}
      {view === "academy" && (
        <section className="page academy">
          <div className="page-title">
            <span>ACADEMIA CRIPTOPULSO</span>
            <h1>Aprende antes de decidir.</h1>
            <p>
              Rutas breves con explicación, ejercicio y aplicación en el
              simulador. El contenido es educativo, no asesoramiento financiero.
            </p>
          </div>
          <div className="course-grid">
            {academyModules.map((course, index) => (
              <article
                className={`course panel ${!hasPaidAccess && index > 0 ? "locked-course" : ""}`}
                key={course.id}
              >
                <span>{course.number}</span>
                <small>{course.lessons.length} lecciones</small>
                <h3>{course.title}</h3>
                <p>{course.summary}</p>
                <button
                  onClick={() =>
                    !hasPaidAccess && index > 0
                      ? setView("plans")
                      : setOpenCourse(course.id)
                  }
                >
                  {!hasPaidAccess && index > 0
                    ? "🔒 Requiere plan"
                    : "Estudiar módulo →"}
                </button>
              </article>
            ))}
          </div>
          {academyModules
            .filter((course) => course.id === openCourse)
            .map((course) => (
              <section className="course-content panel" key={course.id}>
                <div className="panel-label">MÓDULO {course.number}</div>
                <h2>{course.title}</h2>
                <p>{course.summary}</p>
                <div className="lesson-list">
                  {course.lessons
                    .slice(0, hasPaidAccess ? course.lessons.length : 1)
                    .map((lesson, index) => (
                      <article key={lesson.title}>
                        <span>LECCIÓN {index + 1}</span>
                        <h3>{lesson.title}</h3>
                        <p>{lesson.content}</p>
                        <div className="extended-reading">
                          <b>Lectura completa</b>
                          <p>{lessonReadings[course.id]?.[index]}</p>
                        </div>
                        <div>
                          <b>Práctica guiada</b>
                          <p>{lesson.practice}</p>
                        </div>
                      </article>
                    ))}
                </div>
                {hasPaidAccess && (
                  <section className="module-exam">
                    <div className="panel-label">EVALUACIÓN DEL MÓDULO</div>
                    <h2>Verdadero o falso</h2>
                    <p>
                      Responde después de leer las cuatro lecciones. Obtendrás
                      el resultado y una explicación para cada respuesta.
                    </p>
                    {moduleQuizzes[course.id].map((question, index) => {
                      const answerKey = `${course.id}-${index}`;
                      const selectedAnswer = quizAnswers[answerKey];
                      const submitted = quizSubmitted[course.id];
                      const correct = selectedAnswer === question.answer;
                      return (
                        <article
                          className={`quiz-question ${submitted ? (correct ? "quiz-correct" : "quiz-wrong") : ""}`}
                          key={question.statement}
                        >
                          <b>
                            {index + 1}. {question.statement}
                          </b>
                          <div>
                            {[true, false].map((value) => (
                              <button
                                type="button"
                                className={
                                  selectedAnswer === value ? "selected" : ""
                                }
                                disabled={submitted}
                                onClick={() =>
                                  setQuizAnswers((answers) => ({
                                    ...answers,
                                    [answerKey]: value,
                                  }))
                                }
                                key={String(value)}
                              >
                                {value ? "Verdadero" : "Falso"}
                              </button>
                            ))}
                          </div>
                          {submitted && (
                            <p>
                              <strong>{correct ? "Correcto." : "Incorrecto."}</strong>{" "}
                              {question.explanation}
                            </p>
                          )}
                        </article>
                      );
                    })}
                    {!quizSubmitted[course.id] ? (
                      <button
                        className="exam-submit"
                        disabled={moduleQuizzes[course.id].some(
                          (_question, index) =>
                            quizAnswers[`${course.id}-${index}`] === undefined,
                        )}
                        onClick={() =>
                          setQuizSubmitted((submitted) => ({
                            ...submitted,
                            [course.id]: true,
                          }))
                        }
                      >
                        Calificar examen
                      </button>
                    ) : (
                      <div className="exam-result">
                        <b>
                          Resultado:{" "}
                          {
                            moduleQuizzes[course.id].filter(
                              (question, index) =>
                                quizAnswers[`${course.id}-${index}`] ===
                                question.answer,
                            ).length
                          }
                          /{moduleQuizzes[course.id].length}
                        </b>
                        <button
                          onClick={() => {
                            setQuizSubmitted((submitted) => ({
                              ...submitted,
                              [course.id]: false,
                            }));
                            setQuizAnswers((answers) => {
                              const next = { ...answers };
                              moduleQuizzes[course.id].forEach(
                                (_question, index) =>
                                  delete next[`${course.id}-${index}`],
                              );
                              return next;
                            });
                          }}
                        >
                          Volver a intentar
                        </button>
                      </div>
                    )}
                  </section>
                )}
                {!hasPaidAccess && (
                  <div className="premium-gate academy-gate">
                    <b>Lección introductoria gratuita completada</b>
                    <p>
                      Activa un plan para abrir las 24 lecciones, ejercicios y
                      simulaciones guiadas.
                    </p>
                    <button onClick={() => setView("plans")}>Desbloquear academia</button>
                  </div>
                )}
              </section>
            ))}
        </section>
      )}
      {view === "plans" && (
        <section className="page plans">
          <div className="page-title">
            <span>PLANES DE PRÁCTICA</span>
            <h1>Elige cuánto quieres aprender.</h1>
            <p>
              Pagas por acceso educativo y capital virtual. No estás realizando
              una inversión.
            </p>
          </div>
          <div className="plan-grid">
            <article className="plan panel">
              <small>PRUEBA</small>
              <h2>Gratis</h2>
              <strong>
                $10.000 <em>virtuales</em>
              </strong>
              <p>
                Dashboard público
                <br />
                Simulador básico
                <br />
                Primeras lecciones
              </p>
              <button onClick={() => setView("simulator")}>
                Empezar gratis
              </button>
            </article>
            <article className="plan featured panel">
              <div className="popular">MÁS ACCESIBLE</div>
              <small>BÁSICO BOLIVIA</small>
              <h2>
                $1 <em>= Bs {blue.official.toFixed(2)}</em>
              </h2>
              <strong>
                $100.000 <em>virtuales</em>
              </strong>
              <p>
                Simulador completo
                <br />
                Historial de resultados
                <br />
                Academia esencial
              </p>
              <button
                onClick={() => {
                  setPaymentPlan("basic_bo");
                  setPaymentMethod("qr");
                }}
              >
                Ver QR de pago
              </button>
            </article>
            <article className="plan panel">
              <small>CRIPTO 10</small>
              <h2>10 USDT</h2>
              <strong>
                $1.000.000 <em>virtuales</em>
              </strong>
              <p>
                Indicadores avanzados
                <br />
                Varios portafolios
                <br />
                Comparación de estrategias
              </p>
              <button
                onClick={() => {
                  setPaymentPlan("crypto_10");
                  setPaymentMethod("airtm");
                }}
              >
                Pagar por Airtm
              </button>
            </article>
            <article className="plan panel">
              <small>CRIPTO 20</small>
              <h2>20 USDT</h2>
              <strong>
                $2.500.000 <em>virtuales</em>
              </strong>
              <p>
                Todo Cripto 10
                <br />
                Prácticas ilimitadas
                <br />
                Reinicio mensual
              </p>
              <button
                onClick={() => {
                  setPaymentPlan("crypto_20");
                  setPaymentMethod("airtm");
                }}
              >
                Pagar por Airtm
              </button>
            </article>
          </div>
          {paymentMethod === "qr" && (
            <div className="payment-flow qr-flow panel">
              <img
                src="/qr-banco-ganadero.jpg" loading="lazy" decoding="async" width={720} height={1200}
                alt="QR Yolo Pago de Banco Ganadero para pagar el plan en Bolivia"
              />
              <div>
                <div className="panel-label">PAGO EN BOLIVIA</div>
                <h3>Escanea el QR con tu banco</h3>
                <p>
                  Beneficiario: <b>Nelson Mendoza Torres</b>
                </p>
                <p>
                  Para el plan de USD 1 paga{" "}
                  <b>Bs {blue.official.toFixed(2)}</b>, calculado con la
                  referencia mostrada en CriptoPulso.
                </p>
                <p>
                  Guarda el comprobante: el administrador debe verificarlo antes
                  de habilitar tu plan.
                </p>
                <button
                  onClick={() => {
                    setPaymentMethod(null);
                    setView("payment");
                  }}
                >
                  Ya pagué · solicitar verificación
                </button>
              </div>
            </div>
          )}
          {paymentMethod === "airtm" && (
            <div className="payment-flow airtm-flow panel">
              <div className="airtm-mark">A</div>
              <div>
                <div className="panel-label">PAGO INTERNACIONAL</div>
                <h3>Paga mediante Airtm</h3>
                <p>
                  Cuenta de cobro: <b>airtm.me/nelsonal1klodhs6</b>
                </p>
                <p>
                  Abre Airtm, realiza el pago correspondiente al plan y conserva
                  el comprobante para la verificación.
                </p>
                <a
                  className="payment-link"
                  href="https://airtm.me/nelsonal1klodhs6"
                  target="_blank"
                  rel="noreferrer"
                >
                  Abrir cuenta Airtm ↗
                </a>
                <button
                  onClick={() => {
                    setPaymentMethod(null);
                    setView("payment");
                  }}
                >
                  Ya pagué · solicitar verificación
                </button>
              </div>
            </div>
          )}
          {notice && <div className="plan-notice">{notice}</div>}
          <div className="legal-note">
            El capital virtual no es una criptomoneda, no puede retirarse,
            transferirse ni convertirse en dinero real. Las ganancias simuladas
            no generan premios monetarios. La activación ocurre después de la
            verificación del administrador.
          </div>
        </section>
      )}
      {view === "dollar" && (
        <section className="page supplemental-data">
          <article className="point-data panel">
            <div className="panel-label">DATOS DE CADA PUNTO</div>
            <h3>Selecciona un mes del histórico</h3>
            <div className="point-tabs">
              {dollarHistory.map((d, i) => (
                <button
                  className={selectedDollarPoint === i ? "active" : ""}
                  key={d.m}
                  onClick={() => setSelectedDollarPoint(i)}
                >
                  {d.m}
                </button>
              ))}
            </div>
            <div className="selected-point">
              <div>
                <small>PERIODO</small>
                <b>{dollarHistory[selectedDollarPoint].m}</b>
              </div>
              <div>
                <small>REFERENCIA INSTITUCIONAL</small>
                <b>
                  Bs {dollarHistory[selectedDollarPoint].official.toFixed(2)}
                </b>
              </div>
              <div>
                <small>P2P DIGITAL</small>
                <b>Bs {dollarHistory[selectedDollarPoint].p2p.toFixed(2)}</b>
              </div>
              <div>
                <small>BRECHA</small>
                <b>
                  {(
                    (dollarHistory[selectedDollarPoint].p2p /
                      dollarHistory[selectedDollarPoint].official -
                      1) *
                    100
                  ).toFixed(1)}
                  %
                </b>
              </div>
            </div>
            <p className="data-caution">
              La serie histórica continúa marcada como demostrativa hasta
              completar su auditoría documental. No se utiliza para recomendar
              una compra.
            </p>
          </article>
          <article className="energy-panel panel">
            <div className="panel-top">
              <div>
                <div className="panel-label">ENERGÍA Y ECONOMÍA FAMILIAR</div>
                <h3>Petróleo y combustibles</h3>
              </div>
              <small>Referencias · 3–9 ago 2026</small>
            </div>
            <div className="oil-cards">
              <div>
                <small>WTI · BARRIL</small>
                <b>$78.18</b>
                <span>USD por 158,99 litros</span>
              </div>
              <div>
                <small>WTI · EQUIVALENTE</small>
                <b>$0.49/L</b>
                <span>crudo, no combustible refinado</span>
              </div>
              <div>
                <small>BRENT · BARRIL</small>
                <b>$83.55</b>
                <span>referencia internacional</span>
              </div>
            </div>
            <h4>Bolivia · precios regulados mostrados</h4>
            <div className="bolivia-fuels">
              <div>
                <b>Gasolina especial</b>
                <strong>Bs 6,96/L</strong>
                <span>${(6.96 / blue.official).toFixed(2)}/L</span>
              </div>
              <div>
                <b>Diésel oil</b>
                <strong>Bs 9,80/L</strong>
                <span>${(9.8 / blue.official).toFixed(2)}/L</span>
              </div>
              <div>
                <b>Gasolina premium</b>
                <strong>Bs 11,00/L</strong>
                <span>${(11 / blue.official).toFixed(2)}/L</span>
              </div>
              <div>
                <b>GLP domiciliario</b>
                <strong>Bs 22,50/garrafa</strong>
                <span>${(22.5 / blue.official).toFixed(2)} / 10 kg</span>
              </div>
            </div>
            <h4>Comparación con países limítrofes · USD por litro</h4>
            <div className="fuel-legend">
              <span>Gasolina</span>
              <span>Diésel</span>
              <span>GLP/autogás</span>
            </div>
            <div className="regional-chart">
              {regionalFuel.map((r) => (
                <div className="country-fuel" key={r.country}>
                  <b>{r.country}</b>
                  <div>
                    <i style={{ width: `${(r.gasoline / 1.8) * 100}%` }} />
                    <span>${r.gasoline.toFixed(2)}</span>
                  </div>
                  <div>
                    <i style={{ width: `${(r.diesel / 1.8) * 100}%` }} />
                    <span>${r.diesel.toFixed(2)}</span>
                  </div>
                  <div>
                    <i style={{ width: `${(r.lpg / 1.8) * 100}%` }} />
                    <span>${r.lpg.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="family-note">
              <b>Para decisiones familiares</b>
              <p>
                Compara el gasto mensual de transporte y gas, pero revisa
                ciudad, calidad del combustible, impuestos y fecha. Los precios
                regionales son referencias semanales y pueden cambiar.
              </p>
            </div>
          </article>
        </section>
      )}
      {view === "admin" && isAdmin && (
        <section className="page admin-extra">
          <article className="panel admin-identity">
            <div className="panel-label">SEGURIDAD Y ACCESO</div>
            <h3>Administrador principal</h3>
            <p>
              <b>nelalemento@gmail.com</b>
            </p>
            <span>
              Cuenta verificada con Supabase Auth y rol interno de
              administrador. La contraseña nunca se guarda en esta página.
            </span>
          </article>
          <article className="panel real-metrics">
            <div className="panel-label">MÉTRICAS REALES</div>
            <h3>Visitas verificadas</h3>
            <div>
              <span>
                Hoy
                <b>
                  {visitMetrics.today.toLocaleString("es-BO")} visitantes únicos
                </b>
              </span>
              <span>
                Últimos 7 días
                <b>
                  {visitMetrics.sevenDays.toLocaleString("es-BO")} visitantes ·{" "}
                  {visitMetrics.pageViews.toLocaleString("es-BO")} vistas
                </b>
              </span>
              <span>
                Página más vista<b>{visitMetrics.topPage}</b>
              </span>
            </div>
          </article>
          <article className="panel moderation">
            <div className="panel-label">MODERACIÓN DE COMENTARIOS</div>
            <h3>Cola de revisión</h3>
            {notice && <div className="plan-notice">{notice}</div>}
            {comments.map((c) => (
              <div
                key={c.id ?? c.name}
                className={
                  c.status === "reviewed"
                    ? "comment-reviewed"
                    : c.status === "hidden"
                      ? "comment-hidden"
                      : ""
                }
              >
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.asset} · {c.badge}
                  </small>
                </span>
                <p>{c.text}</p>
                <button
                  onClick={() =>
                    moderateComment(
                      c.id,
                      c.status === "hidden" ? "restore" : "hide",
                    )
                  }
                >
                  {c.status === "hidden" ? "Restaurar" : "Ocultar"}
                </button>
                <button
                  disabled={c.status === "reviewed"}
                  onClick={() => moderateComment(c.id, "review")}
                >
                  {c.status === "reviewed" ? "Revisado ✓" : "Marcar revisado"}
                </button>
              </div>
            ))}
          </article>
        </section>
      )}
      <footer>
        <div className="brand">
          <span>◉</span>CRIPTO<b>PULSO</b>
        </div>
        <p>
          Datos educativos para comprender el mercado. No ofrecemos
          asesoramiento financiero.
        </p>
        <span>© 2026 CriptoPulso</span>
      </footer>
    </main>
  );
}
