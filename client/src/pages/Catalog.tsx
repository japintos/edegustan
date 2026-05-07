import { FormEvent, useEffect, useState } from "react";
import { ProductCard } from "../components/ProductCard";
import { api } from "../api/client";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchProducts } from "../store";
import type { Category } from "../types";

export function Catalog() {
  const dispatch = useAppDispatch();
  const { products, loading } = useAppSelector((state) => state.catalog);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filters, setFilters] = useState({ search: "", category: "", min: "", max: "" });

  useEffect(() => {
    dispatch(fetchProducts(""));
    api<{ categories: Category[] }>("/products/categories").then((data) => setCategories(data.categories));
  }, [dispatch]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
    dispatch(fetchProducts(`?${params.toString()}`));
  };

  return (
    <section className="catalog-page">
      <div className="catalog-hero">
        <p className="eyebrow">Catalogo Degustan</p>
        <h1>Bebidas para regalar, compartir y disfrutar</h1>
        <p>Filtrá por categoría, precio o nombre y armá tu compra con stock actualizado.</p>
      </div>
      <div className="catalog-layout">
        <aside className="filter-panel">
          <p className="eyebrow">Refinar busqueda</p>
          <form className="filters" onSubmit={submit}>
            <label>
              Buscar
              <input placeholder="Malbec, IPA, whisky..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
            </label>
            <label>
              Categoria
              <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
                <option value="">Todas las categorias</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
              </select>
            </label>
            <div className="price-row">
              <label>
                Min.
                <input type="number" min="0" placeholder="$0" value={filters.min} onChange={(e) => setFilters({ ...filters, min: e.target.value })} />
              </label>
              <label>
                Max.
                <input type="number" min="0" placeholder="$99999" value={filters.max} onChange={(e) => setFilters({ ...filters, max: e.target.value })} />
              </label>
            </div>
            <button>Aplicar filtros</button>
          </form>
        </aside>
        <div className="catalog-results">
          <div className="section-title">
            <div>
              <p className="eyebrow">{products.length} productos disponibles</p>
              <h2>Elegidos para vos</h2>
            </div>
          </div>
          {loading ? <p className="loading-card">Cargando bebidas...</p> : <div className="grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}
        </div>
      </div>
    </section>
  );
}
