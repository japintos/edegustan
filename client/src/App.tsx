import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactElement } from "react";
import { Layout } from "./components/Layout";
import { useAppSelector } from "./hooks";
import { Account } from "./pages/Account";
import { Admin } from "./pages/Admin";
import { Login, Register, VerifyEmail } from "./pages/Auth";
import { CartPage } from "./pages/Cart";
import { Catalog } from "./pages/Catalog";
import { Checkout } from "./pages/Checkout";
import { Contact } from "./pages/Contact";
import { Home } from "./pages/Home";

function RequireAuth({ children }: { children: ReactElement }) {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/catalogo" element={<RequireAuth><Catalog /></RequireAuth>} />
          <Route path="/carrito" element={<RequireAuth><CartPage /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/mi-cuenta" element={<RequireAuth><Account /></RequireAuth>} />
          <Route path="/contacto" element={<RequireAuth><Contact /></RequireAuth>} />
          <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/verificar-email" element={<VerifyEmail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
