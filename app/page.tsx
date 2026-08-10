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
const communitySeed = [
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
];

const fmt = (n: number) =>
  n >= 1000
    ? `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 4 : 2 })}`;
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
  const [comments, setComments] = useState(communitySeed);
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
  const coin = coins.find((c) => c.id === selected) ?? coins[0];
  const loadAccess = async (user: User | null) => {
    setAuthUser(user);
    if (!user) {
      setIsAdmin(false);
      return false;
    }
    const { data } = await supabase
      .from("profiles")
      .select("role,status")
      .eq("user_id", user.id)
      .single();
    const allowed = data?.role === "admin" && data?.status === "active";
    setIsAdmin(allowed);
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
    setView("market");
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
  const reviewPayment = async (id: string, action: "approve" | "reject") => {
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
    setNotice(
      response.ok
        ? (body.message ??
            (action === "approve"
              ? "Pago aprobado e invitación enviada."
              : "Solicitud rechazada."))
        : (body.error ?? "No se pudo procesar."),
    );
    if (response.ok) loadPaymentRequests();
  };
  const submitPaymentRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRequestStatus("Enviando solicitud…");
    const response = await fetch("/api/payment-requests", {
      method: "POST",
      body: new FormData(e.currentTarget),
    });
    const body = await response.json();
    if (!response.ok) {
      setRequestStatus(body.error ?? "No se pudo enviar.");
      return;
    }
    e.currentTarget.reset();
    setRequestStatus(
      "Solicitud recibida. Revisaremos el pago y enviaremos la invitación a tu correo.",
    );
  };
  useEffect(() => {
    fetch(
      "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,solana,binancecoin,ripple,cardano&price_change_percentage=24h",
    )
      .then((r) => r.json())
      .then((rows) => {
        if (!Array.isArray(rows)) return;
        setCoins((old) =>
          old.map((c) => {
            const n = rows.find((r: { id: string }) => r.id === c.id);
            return n
              ? {
                  ...c,
                  price: n.current_price,
                  change: n.price_change_percentage_24h ?? 0,
                  cap: compact(n.market_cap),
                  volume: compact(n.total_volume),
                }
              : c;
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
              onClick={() => setView(id as typeof view)}
            >
              {label}
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
        {coins.map((c) => (
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
                <button onClick={() => setShowAllTrends((v) => !v)}>
                  {showAllTrends ? "Ver destacadas" : "Ver todas las monedas"} →
                </button>
              </div>
              <p className="radar-help">
                Ordena activos por fuerza de señal y confianza. Abre una moneda
                para ver por qué aparece.
              </p>
              {coins.slice(0, showAllTrends ? coins.length : 4).map((c) => (
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
                <h3>Todas las criptomonedas disponibles</h3>
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
            {coins
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
          <div className="public-traffic panel">
            <span>◉ COMUNIDAD EN CRECIMIENTO</span>
            <b>Las visitas públicas se mostrarán cuando exista medición real</b>
            <small>
              No inflamos cifras: el administrador verá sesiones, usuarios y
              páginas vistas verificadas.
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
              {coins
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
              preserveAspectRatio="none"
              aria-label="Gráfico histórico demostrativo del dólar en Bolivia"
            >
              {[0, 1, 2, 3, 4].map((i) => (
                <line
                  key={i}
                  x1="45"
                  x2="900"
                  y1={35 + i * 62}
                  y2={35 + i * 62}
                  className="grid-line"
                />
              ))}
              <polyline
                points={dollarHistory
                  .map(
                    (d, i) => `${55 + i * 76},${300 - (d.official - 6) * 31}`,
                  )
                  .join(" ")}
                className="history-official"
              />
              <polyline
                points={dollarHistory
                  .map((d, i) => `${55 + i * 76},${300 - (d.p2p - 6) * 31}`)
                  .join(" ")}
                className="history-p2p"
              />
              {dollarHistory.map((d, i) => (
                <g key={d.m}>
                  <circle
                    cx={55 + i * 76}
                    cy={300 - (d.p2p - 6) * 31}
                    r="4"
                    className="p2p-dot"
                  />
                  <text x={55 + i * 76} y="322" className="month-label">
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
              <select aria-label="Activo del comentario">
                <option>{coin.symbol}</option>
                <option>USD/BOB</option>
                <option>BTC</option>
                <option>ETH</option>
              </select>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Explica qué observas, en qué plazo y qué riesgo considerarías…"
              />
              <button
                className="practice"
                onClick={() => {
                  if (comment.trim()) {
                    setComments((c) => [
                      {
                        name: "Tú",
                        badge: "Nuevo analista",
                        asset: coin.symbol,
                        text: comment,
                        useful: 0,
                        score: 0,
                      },
                      ...c,
                    ]);
                    setComment("");
                  }
                }}
              >
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
              <span>COMPROBANTE</span>
            </div>
            {adminRequests.some((r) => r.status !== "pending") ? (
              adminRequests
                .filter((r) => r.status !== "pending")
                .map((r) => (
                  <div className="admin-row" key={`history-${r.id}`}>
                    <b>
                      {r.full_name}
                      <small>{r.email}</small>
                    </b>
                    <span>
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
            <p>Cursos breves, ejemplos reales y práctica guiada.</p>
          </div>
          <div className="course-grid">
            {[
              [
                "01",
                "Fundamentos cripto",
                "8 lecciones",
                "Qué es blockchain, Bitcoin, wallets y seguridad.",
              ],
              [
                "02",
                "Leer el mercado",
                "12 lecciones",
                "Velas, tendencias, soportes y resistencias.",
              ],
              [
                "03",
                "Indicadores técnicos",
                "10 lecciones",
                "RSI, MACD, medias móviles y volumen.",
              ],
              [
                "04",
                "Gestión de riesgo",
                "7 lecciones",
                "Tamaño de posición, diversificación y disciplina.",
              ],
              [
                "05",
                "Simulación guiada",
                "15 prácticas",
                "Aplica señales y compara tus decisiones.",
              ],
              [
                "06",
                "Evitar estafas",
                "6 lecciones",
                "Reconoce promesas engañosas y protege tus activos.",
              ],
            ].map((c) => (
              <article className="course panel" key={c[0]}>
                <span>{c[0]}</span>
                <small>{c[2]}</small>
                <h3>{c[1]}</h3>
                <p>{c[3]}</p>
                <button>Ver contenido →</button>
              </article>
            ))}
          </div>
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
                src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/4gIoSUNDX1BST0ZJTEUAAQEAAAIYAAAAAAIQAABtbnRyUkdCIFhZWiAAAAAAAAAAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAAHRyWFlaAAABZAAAABRnWFlaAAABeAAAABRiWFlaAAABjAAAABRyVFJDAAABoAAAAChnVFJDAAABoAAAAChiVFJDAAABoAAAACh3dHB0AAAByAAAABRjcHJ0AAAB3AAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAFgAAAAcAHMAUgBHAEIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z3BhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABYWVogAAAAAAAA9tYAAQAAAADTLW1sdWMAAAAAAAAAAQAAAAxlblVTAAAAIAAAABwARwBvAG8AZwBsAGUAIABJAG4AYwAuACAAMgAwADEANv/bAEMAAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/bAEMBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAf/AABEIBLAC0AMBIgACEQEDEQH/xAAfAAEAAgMBAQEBAQEAAAAAAAAACQoHCAsGBQQBAwL/xABkEAAABgMBAAEDAgICDAgHASECAwQFBgcAAQgJChESExQVFiEXIhojMTlYd3iYtrfW1xgZNzpBUVmXJDJXdpS11TM1NjhUYXF1lpm40yU0VoGRsbTUQlJ00SZEaZKVc6izwuj/xAAdAQEAAQUBAQEAAAAAAAAAAAAAAQIDBAUHBggJ/8QAOhEBAAIBAwMCBAMHAwMFAQEAAAECAwQFEQYSITFBBxNRYRQicQgygZGhsfAVI8EWQtEzUmLh8Rgk/9oADAMBAAIRAxEAPwC/xjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGM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CZmbTMzPMz7mMYyhBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMBjGMD//Z"
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
                Hoy<b>Se activa al conectar analítica</b>
              </span>
              <span>
                Últimos 7 días<b>Sin datos inventados</b>
              </span>
              <span>
                Páginas más vistas<b>Pendiente de medición</b>
              </span>
            </div>
          </article>
          <article className="panel moderation">
            <div className="panel-label">MODERACIÓN DE COMENTARIOS</div>
            <h3>Cola de revisión</h3>
            {comments.map((c, i) => (
              <div key={c.name}>
                <span>
                  <b>{c.name}</b>
                  <small>
                    {c.asset} · {c.badge}
                  </small>
                </span>
                <p>{c.text}</p>
                <button
                  onClick={() =>
                    setComments((all) => all.filter((_, j) => j !== i))
                  }
                >
                  Ocultar
                </button>
                <button>Marcar revisado</button>
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
