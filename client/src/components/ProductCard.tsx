import type { Product } from "../types";
import { useAppDispatch, useAppSelector } from "../hooks";
import { addToCart } from "../store";
import { Link } from "react-router-dom";

export function ProductCard({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const authenticated = useAppSelector((state) => Boolean(state.auth.token));

  return (
    <article className="product-card">
      <div className="product-image">
        {product.imagenUrl ? <img src={product.imagenUrl} alt={product.nombre} /> : <span>Degustan</span>}
        {product.destacado && <span className="product-badge">Destacado</span>}
      </div>
      <div className="product-content">
        <p className="eyebrow">{product.categoria ?? "Bebidas"}</p>
        <h3>{product.nombre}</h3>
        <p>{product.descripcion ?? "Seleccion premium de Degustan Drink-Store."}</p>
      </div>
      <div className="stock-line">
        <span>{product.stock > 0 ? `${product.stock} disponibles` : "Sin stock"}</span>
        {product.stock > 0 && product.stock <= product.stockMinimo && <strong>Ultimas unidades</strong>}
      </div>
      <div className="product-footer">
        <div>
          <small>Precio</small>
          <strong>${product.precio.toLocaleString("es-AR")}</strong>
        </div>
        {authenticated ? (
          <button className="add-button" disabled={product.stock < 1} onClick={() => dispatch(addToCart({ productoId: product.id, cantidad: 1 }))}>
            {product.stock > 0 ? "Agregar" : "Sin stock"}
          </button>
        ) : (
          <Link className="button add-button" to="/registro">Registrarme</Link>
        )}
      </div>
    </article>
  );
}
