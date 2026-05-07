import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ProductCard } from "../components/ProductCard";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchProducts } from "../store";

export function Home() {
  const dispatch = useAppDispatch();
  const products = useAppSelector((state) => state.catalog.products.slice(0, 3));
  const token = useAppSelector((state) => state.auth.token);
  const catalogPath = token ? "/catalogo" : "/registro";

  useEffect(() => {
    dispatch(fetchProducts("?search="));
  }, [dispatch]);

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Bebidas premium en Misiones</p>
          <h1>Elegí mejor. Tomá con estilo.</h1>
          <p>Vinos, cervezas artesanales, whiskies y bebidas seleccionadas para regalos, encuentros y momentos especiales.</p>
          <div className="actions">
            <Link className="button" to={catalogPath}>{token ? "Explorar bebidas" : "Crear cuenta y explorar"}</Link>
            <Link className="ghost hero-link" to={token ? "/contacto" : "/login"}>{token ? "Pedir recomendacion" : "Ingresar"}</Link>
          </div>
          <div className="hero-metrics" aria-label="Beneficios de compra">
            <span><strong>Stock real</strong> actualizado al instante</span>
            <span><strong>Pago facil</strong> transferencia o Mercado Pago</span>
            <span><strong>Atencion</strong> personalizada</span>
          </div>
        </div>
        <div className="hero-showcase">
          <div className="bottle-card bottle-primary">
            <span>Reserva</span>
            <strong>Malbec</strong>
          </div>
          <div className="bottle-card bottle-secondary">
            <span>Craft</span>
            <strong>IPA</strong>
          </div>
          <div className="floating-offer">
            <span>Selecciones para regalar</span>
            <strong>desde el catalogo</strong>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <article><strong>Compra protegida</strong><span>Confirmacion por email</span></article>
        <article><strong>Catalogo curado</strong><span>Bebidas para cada ocasion</span></article>
        <article><strong>Stock conectado</strong><span>Integrado con la administracion local</span></article>
      </section>

      <section className="category-story">
        <div className="section-title">
          <div>
            <p className="eyebrow">Pasea por la tienda</p>
            <h2>Encontrá la bebida ideal</h2>
          </div>
          <Link to={catalogPath}>Ver catalogo completo</Link>
        </div>
        <div className="category-grid">
          <Link to={catalogPath} className="category-tile wine"><span>Vinos</span><strong>Para cenas y regalos</strong></Link>
          <Link to={catalogPath} className="category-tile beer"><span>Cervezas</span><strong>Artesanales y clasicas</strong></Link>
          <Link to={catalogPath} className="category-tile spirits"><span>Destilados</span><strong>Whisky, licores y mas</strong></Link>
        </div>
      </section>

      <section>
        <div className="section-title">
          <div>
            <p className="eyebrow">Selecciones de la casa</p>
            <h2>Productos destacados</h2>
          </div>
          <Link to={catalogPath}>Comprar ahora</Link>
        </div>
        <div className="grid">
          {products.map((product) => <ProductCard key={product.id} product={product} />)}
        </div>
      </section>

      <section className="seo-panel">
        <p className="eyebrow">Degustan Drink-Store</p>
        <h2>Tienda de bebidas online con vinos, cervezas y destilados</h2>
        <p>Explorá un catálogo pensado para comprar rápido, descubrir opciones nuevas y elegir con confianza. Cada producto muestra precio, stock disponible y categoría para que encuentres justo lo que necesitás.</p>
      </section>
    </>
  );
}
