import { useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchCart } from "../store";

export function CartPage() {
  const dispatch = useAppDispatch();
  const cart = useAppSelector((state) => state.cart.cart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const remove = async (id: number) => {
    await api(`/cart/items/${id}`, { method: "DELETE" });
    dispatch(fetchCart());
  };

  return (
    <section className="cart-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Tu seleccion</p>
          <h1>Carrito de compras</h1>
        </div>
        <Link to="/catalogo">Seguir comprando</Link>
      </div>
      <div className="checkout-layout">
        <div className="cart-list">
          {cart.items.length === 0 && <p className="empty-state">Tu carrito esta vacio. Explorá el catálogo y agregá tus bebidas favoritas.</p>}
          {cart.items.map((item) => (
            <article className="cart-row" key={item.id}>
              <div>
                <strong>{item.product?.nombre}</strong>
                <span>{item.cantidad} unidad(es)</span>
              </div>
              <strong>${item.subtotal.toLocaleString("es-AR")}</strong>
              <button className="ghost small" onClick={() => remove(item.id)}>Quitar</button>
            </article>
          ))}
        </div>
        <aside className="summary">
          <span>Total estimado</span>
          <strong>${cart.total.toLocaleString("es-AR")}</strong>
          <p>El stock se confirma al finalizar la compra.</p>
          <Link className="button" to="/checkout">Continuar al checkout</Link>
        </aside>
      </div>
    </section>
  );
}
