"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase";

export default function ActivateAccount() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
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
    </main>
  );
}
