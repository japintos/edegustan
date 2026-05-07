import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { useAppDispatch, useAppSelector } from "../hooks";
import { setUser } from "../store";
import type { User } from "../types";

interface OrderHistoryItem {
  id: number;
  total: string | number;
  estado: string;
}

type Notice = { type: "success" | "error"; message: string } | null;

const errorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function Account() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [orders, setOrders] = useState<OrderHistoryItem[]>([]);
  const [notice, setNotice] = useState<Notice>(null);
  const [passwords, setPasswords] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api<{ orders: OrderHistoryItem[] }>("/orders").then((data) => setOrders(data.orders)).catch(() => setOrders([]));
  }, []);

  const submitProfile = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const form = new FormData(event.currentTarget as HTMLFormElement);

    try {
      const response = await api<{ user: User; message: string }>("/auth/me", {
        method: "PUT",
        body: JSON.stringify({
          nombre: form.get("nombre"),
          apellido: form.get("apellido"),
          telefono: form.get("telefono"),
          direccion: form.get("direccion")
        })
      });
      dispatch(setUser(response.user));
      setNotice({ type: "success", message: response.message });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error, "No se pudo actualizar el perfil") });
    }
  };

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setNotice({ type: "error", message: "La nueva contraseña y su confirmacion no coinciden" });
      return;
    }

    try {
      const response = await api<{ message: string }>("/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword
        })
      });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice({ type: "success", message: response.message });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error, "No se pudo actualizar la contraseña") });
    }
  };

  const uploadProfileImage = async (file: File) => {
    setUploading(true);
    setNotice(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      const response = await api<{ user: User; message: string }>("/auth/me/profile-image", {
        method: "POST",
        body: formData
      });
      dispatch(setUser(response.user));
      setNotice({ type: "success", message: response.message });
    } catch (error) {
      setNotice({ type: "error", message: errorMessage(error, "No se pudo subir la foto") });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="account-page">
      <div className="section-title">
        <div>
          <p className="eyebrow">Area de cliente</p>
          <h1>Mi Cuenta</h1>
        </div>
      </div>

      {notice && <p className={notice.type === "error" ? "form-message error" : "form-message success"}>{notice.message}</p>}

      <div className="account-layout">
        <aside className="account-profile-card">
          <div className="profile-avatar">
            {user?.perfilImagenUrl ? <img src={user.perfilImagenUrl} alt="Foto de perfil" /> : <span>{user?.nombre?.[0] ?? "D"}</span>}
          </div>
          <h2>{user ? `${user.nombre} ${user.apellido}` : "Cargando cuenta..."}</h2>
          <p>{user?.email ?? "Validando sesion registrada"}</p>
          <label className="profile-upload">
            {uploading ? "Subiendo foto..." : "Cambiar foto de perfil"}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadProfileImage(file);
              }}
            />
          </label>
        </aside>

        <div className="account-forms">
          <form className="account-card" onSubmit={submitProfile} key={user?.id ?? "profile"}>
            <p className="eyebrow">Datos personales</p>
            <h2>Editar perfil</h2>
            <div className="form-row">
              <label>Nombre<input name="nombre" required defaultValue={user?.nombre ?? ""} /></label>
              <label>Apellido<input name="apellido" required defaultValue={user?.apellido ?? ""} /></label>
            </div>
            <label>Telefono<input name="telefono" defaultValue={user?.telefono ?? ""} /></label>
            <label>Direccion<textarea name="direccion" defaultValue={user?.direccion ?? ""} /></label>
            <button>Guardar datos</button>
          </form>

          <form className="account-card" onSubmit={submitPassword}>
            <p className="eyebrow">Seguridad</p>
            <h2>Cambiar contraseña</h2>
            <label>Contraseña actual<input required type="password" value={passwords.currentPassword} onChange={(event) => setPasswords({ ...passwords, currentPassword: event.target.value })} /></label>
            <div className="form-row">
              <label>Nueva contraseña<input required minLength={8} type="password" value={passwords.newPassword} onChange={(event) => setPasswords({ ...passwords, newPassword: event.target.value })} /></label>
              <label>Confirmar nueva contraseña<input required minLength={8} type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords({ ...passwords, confirmPassword: event.target.value })} /></label>
            </div>
            <button>Actualizar contraseña</button>
          </form>
        </div>
      </div>

      <div className="section-title compact">
        <div>
          <p className="eyebrow">Compras recientes</p>
          <h2>Historial de pedidos</h2>
        </div>
      </div>
      <div className="cart-list">
        {orders.length === 0 && <p className="empty-state">Todavia no tenes pedidos online.</p>}
        {orders.map((order) => (
          <article className="cart-row" key={order.id}>
            <span>Pedido #{order.id}</span>
            <span>{order.estado}</span>
            <strong>${Number(order.total).toLocaleString("es-AR")}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
