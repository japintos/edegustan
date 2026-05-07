import { Link, NavLink, Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../hooks";
import { fetchMe, logout } from "../store";

export function Layout() {
  const dispatch = useAppDispatch();
  const { user, token } = useAppSelector((state) => state.auth);
  const cartCount = useAppSelector((state) => state.cart.cart.items.reduce((sum, item) => sum + item.cantidad, 0));

  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [dispatch, token, user]);

  return (
    <>
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <img src="/logo.jpg" alt="Logo Degustan Drink-Store" />
          </span>
          <span className="brand-copy">
            <strong>Degustan</strong>
            <small>Drink-Store</small>
          </span>
        </Link>
        <nav className="main-nav" aria-label="Navegacion principal">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/catalogo">Catalogo</NavLink>
          <NavLink to="/carrito">Carrito ({cartCount})</NavLink>
          <NavLink to="/mi-cuenta">Mi Cuenta</NavLink>
          <NavLink to="/contacto">Contacto</NavLink>
          {user?.role === "admin" && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-chip">{user.nombre}</span>
              <button className="ghost small" onClick={() => dispatch(logout())}>Salir</button>
            </>
          ) : (
            <Link className="button small" to="/login">Ingresar</Link>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="footer-brand">
          <img src="/logo.jpg" alt="Logo Degustan Drink-Store" />
          <div>
            <strong>Degustan Drink-Store</strong>
            <p>Bebidas seleccionadas, compra segura y stock actualizado en tiempo real.</p>
          </div>
        </div>
        <div className="footer-links">
          <Link to="/catalogo">Catalogo</Link>
          <Link to="/contacto">Contacto</Link>
          <Link to="/mi-cuenta">Mi Cuenta</Link>
        </div>
        <p className="developer-credit">
          Desarrollo por Pintos Julio y Agustin Burgos para{" "}
          <a href="https://www.webxpert.com.ar" target="_blank" rel="noreferrer">WebXpert</a>
        </p>
      </footer>
    </>
  );
}
