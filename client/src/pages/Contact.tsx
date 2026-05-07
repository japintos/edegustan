import { FormEvent, useState } from "react";
import { api } from "../api/client";

export function Contact() {
  const [sent, setSent] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await api("/contact", {
      method: "POST",
      body: JSON.stringify(Object.fromEntries(form.entries()))
    });
    setSent(true);
  };

  return (
    <section className="contact-page">
      <div className="contact-copy">
        <p className="eyebrow">Estamos para ayudarte</p>
        <h1>¿Buscás una bebida especial?</h1>
        <p>Consultanos por regalos, eventos, disponibilidad o recomendaciones. Te respondemos por email.</p>
      </div>
      <div className="auth-card">
        {sent ? <p>Gracias, recibimos tu consulta.</p> : (
          <form onSubmit={submit}>
            <label>
              Nombre
              <input name="name" required placeholder="Tu nombre" />
            </label>
            <label>
              Email
              <input name="email" required type="email" placeholder="tu@email.com" />
            </label>
            <label>
              Mensaje
              <textarea name="message" required minLength={10} placeholder="Contanos que estas buscando" />
            </label>
            <button>Enviar consulta</button>
          </form>
        )}
      </div>
    </section>
  );
}
