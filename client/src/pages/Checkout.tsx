import { FormEvent, useState } from "react";
import { api } from "../api/client";
import type { Order } from "../types";

const pickupPolicy =
  "Los pedidos no retirados dentro de las 72 hs se consideran desistidos. Si el pedido fue pagado por Mercado Pago o transferencia, no hay devolucion del dinero.";

export function Checkout() {
  const [order, setOrder] = useState<Order | null>(null);
  const [form, setForm] = useState({
    direccion: "",
    telefono: "",
    email: "",
    paymentMethod: "transferencia",
    tipoEntrega: "delivery"
  });

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const data = await api<{ order: Order }>("/orders/checkout", {
      method: "POST",
      body: JSON.stringify({
        paymentMethod: form.paymentMethod,
        shipping: {
          direccion: form.direccion,
          telefono: form.telefono,
          email: form.email,
          tipoEntrega: form.tipoEntrega
        }
      })
    });
    setOrder(data.order);
  };

  if (order) {
    return (
      <section className="checkout-result">
        <p className="eyebrow">Compra iniciada</p>
        <h1>Pedido #{order.id}</h1>
        <p>Tu pedido fue creado correctamente. Te enviamos la confirmacion por email.</p>
        <div className="delivery-summary">
          <strong>{order.tipoEntrega === "retiro" ? "Retiro en local" : "Delivery"}</strong>
          <span>Disponible hoy de 18:30 a 23:00.</span>
          {order.deliveryACargoComprador && <small>El costo de delivery corre por cuenta del comprador.</small>}
          {order.tipoEntrega === "retiro" && <small>{pickupPolicy}</small>}
        </div>
        <div className="summary inline-summary">
          <span>Total</span>
          <strong>${order.total.toLocaleString("es-AR")}</strong>
        </div>
        {order.checkoutUrl && <a className="button" href={order.checkoutUrl}>Pagar con Mercado Pago</a>}
        {order.bank && (
          <div className="bank-card">
            <h2>Datos para transferencia</h2>
            <p>Titular: {order.bank.holder}</p>
            <p>Banco: {order.bank.bank}</p>
            <p>CBU: {order.bank.cbu}</p>
            <p>Alias: {order.bank.alias}</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="checkout-layout">
      <div className="auth-card checkout-card">
        <p className="eyebrow">Finalizar compra</p>
        <h1>Datos de entrega y pago</h1>
        <form onSubmit={submit}>
          <div className="delivery-options">
            <label className={form.tipoEntrega === "delivery" ? "delivery-option selected" : "delivery-option"}>
              <input
                type="radio"
                name="tipoEntrega"
                value="delivery"
                checked={form.tipoEntrega === "delivery"}
                onChange={() => setForm({ ...form, tipoEntrega: "delivery", paymentMethod: form.paymentMethod === "efectivo" ? "transferencia" : form.paymentMethod })}
              />
              <strong>Delivery</strong>
              <span>Hoy de 18:30 a 23:00. Costo a cargo del comprador.</span>
            </label>
            <label className={form.tipoEntrega === "retiro" ? "delivery-option selected" : "delivery-option"}>
              <input type="radio" name="tipoEntrega" value="retiro" checked={form.tipoEntrega === "retiro"} onChange={() => setForm({ ...form, tipoEntrega: "retiro", direccion: "" })} />
              <strong>Retiro en local</strong>
              <span>Hoy de 18:30 a 23:00.</span>
            </label>
          </div>
          {form.tipoEntrega === "delivery" && (
            <label>
              Direccion de envio
              <textarea required placeholder="Calle, numero, barrio, ciudad" onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </label>
          )}
          <label>
            Telefono
            <input placeholder="Para coordinar la entrega" onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
          </label>
          <label>
            Email de contacto
            <input type="email" placeholder="tu@email.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label>
            Metodo de pago
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
              <option value="transferencia">Transferencia bancaria</option>
              <option value="mercadopago">Mercado Pago</option>
              {form.tipoEntrega === "retiro" && <option value="efectivo">Pago al retirar / efectivo en local</option>}
            </select>
          </label>
          {form.tipoEntrega === "retiro" && (
            <div className="checkout-policy">
              <strong>Importante sobre el retiro</strong>
              <span>{pickupPolicy}</span>
            </div>
          )}
          <button>Confirmar compra</button>
        </form>
      </div>
      <aside className="checkout-aside">
        <strong>Compra segura</strong>
        <p>Validamos stock antes de crear el pedido y registramos la venta en la base administrativa existente.</p>
        <span>Entregas y retiros disponibles hoy de 18:30 a 23:00. El delivery es a cargo del comprador.</span>
        <span>Los pedidos no retirados a las 72 hs se consideran desistidos.</span>
      </aside>
    </section>
  );
}
