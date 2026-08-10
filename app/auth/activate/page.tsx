"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ActivateAccount() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [sending, setSending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < 10)
      return setMessage("Usa por lo menos 10 caracteres.");
    const { error } = await createClient().auth.updateUser({ password });
    if (error)
      return setMessage(
        "El enlace venció o no pudo activarse. Solicita uno nuevo.",
      );
    setDone(true);
    setMessage("Cuenta activada. Ya puedes iniciar sesión en CriptoPulso.");
  }
  async function requestNewLink(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setMessage("");
    const response = await fetch("/api/auth/request-access-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const body = await response.json();
    setMessage(
      body.message ??
        "Si el correo tiene acceso autorizado, recibirás un enlace nuevo.",
    );
    setSending(false);
  }
  return (
    <main className="auth-page">
      <form className="auth-card panel" onSubmit={submit}>
        <div className="panel-label">ACTIVAR CUENTA</div>
        <h1>Crea tu contraseña</h1>
        <p>
          Tu pago fue aprobado. Define una contraseña exclusiva para
          CriptoPulso.
        </p>
        {!done && (
          <label>
            Nueva contraseña
            <input
              type="password"
              minLength={10}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <div className={done ? "plan-notice" : "auth-error"}>{message}</div>
        {!done ? (
          <button className="practice">Activar cuenta</button>
        ) : (
          <a className="practice" href="/">
            Ir a iniciar sesión
          </a>
        )}
      </form>
      {!done && (
        <form className="auth-card panel" onSubmit={requestNewLink}>
          <div className="panel-label">¿EL ENLACE VENCIÓ?</div>
          <h2>Solicita uno nuevo</h2>
          <p>
            Escribe el mismo correo del pago aprobado. Enviaremos una nueva
            invitación o un enlace para recuperar tu contraseña.
          </p>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button className="auth-logout" disabled={sending}>
            {sending ? "Enviando…" : "Enviar enlace nuevo"}
          </button>
          <small>Por seguridad, puedes pedir uno cada 5 minutos.</small>
        </form>
      )}
    </main>
  );
}
