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
                {coins.map((c) => (
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
