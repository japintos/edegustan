import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAppDispatch } from "../hooks";
import { login, register } from "../store";
import { api } from "../api/client";

type ToastState = {
  type: "success" | "error";
  message: string;
} | null;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
};

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  if (!toast) return null;

  return (
    <div className={`auth-toast ${toast.type}`} role="alert">
      <span>{toast.message}</span>
      <button type="button" onClick={onClose} aria-label="Cerrar notificacion">x</button>
    </div>
  );
}

export function Login() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [toast, setToast] = useState<ToastState>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setToast(null);

    try {
      await dispatch(login(form)).unwrap();
      navigate("/catalogo");
    } catch (error) {
      setToast({ type: "error", message: getErrorMessage(error, "No pudimos iniciar sesion. Revisa tus datos e intenta nuevamente.") });
    }
  };

  return (
    <section className="auth-card">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <p className="eyebrow">Bienvenido otra vez</p>
      <h1>Ingresar a mi cuenta</h1>
      <p>Accede a tu carrito, historial de pedidos y compras guardadas.</p>
      <form onSubmit={submit}>
        <label>
          Email
          <input type="email" required placeholder="tu@email.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" required placeholder="Tu password" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button>Entrar</button>
      </form>
      <Link to="/registro">Crear cuenta</Link>
    </section>
  );
}

export function Register() {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({ nombre: "", apellido: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setToast(null);

    try {
      const response = await dispatch(register(form)).unwrap();
      setMessage(response.message);
      setRegisteredEmail(form.email);
      setToast({ type: "success", message: "Cuenta creada. Revisa tu correo para validar el codigo." });
    } catch (error) {
      setToast({ type: "error", message: getErrorMessage(error, "No pudimos crear la cuenta. Intenta nuevamente.") });
    }
  };

  return (
    <section className="auth-card">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <p className="eyebrow">Sumate a Degustan</p>
      <h1>Crear cuenta</h1>
      <p>Registrate para comprar más rápido y recibir la confirmación de tus pedidos.</p>
      {message && (
        <div className="auth-notice">
          <strong>Cuenta creada</strong>
          <p>{message}</p>
        </div>
      )}
      {registeredEmail && <VerificationCodeForm initialEmail={registeredEmail} />}
      <form onSubmit={submit}>
        <label>
          Nombre
          <input required placeholder="Tu nombre" onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </label>
        <label>
          Apellido
          <input required placeholder="Tu apellido" onChange={(e) => setForm({ ...form, apellido: e.target.value })} />
        </label>
        <label>
          Email
          <input type="email" required placeholder="tu@email.com" onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>
          Password
          <input type="password" required minLength={8} placeholder="Minimo 8 caracteres" onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button>Registrarme</button>
      </form>
      <p>Te enviaremos un correo de confirmacion cuando SMTP este configurado.</p>
    </section>
  );
}

export function VerifyEmail() {
  const [params] = useSearchParams();
  const initialEmail = params.get("email") ?? "";

  return (
    <section className="auth-card">
      <p className="eyebrow">Validacion de cuenta</p>
      <h1>Ingresa tu codigo</h1>
      <p>Escribi el codigo de 4 digitos que te enviamos por email para activar tu cuenta.</p>
      <VerificationCodeForm initialEmail={initialEmail} />
    </section>
  );
}

function VerificationCodeForm({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<ToastState>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    try {
      const response = await api<{ message: string }>("/auth/verify-email", {
        method: "POST",
        body: JSON.stringify({ email, code })
      });
      setStatus("success");
      setMessage(response.message);
      setToast({ type: "success", message: "Cuenta verificada correctamente." });
    } catch (error) {
      setStatus("error");
      const errorMessage = getErrorMessage(error, "No se pudo verificar el codigo.");
      setMessage(errorMessage);
      setToast({ type: "error", message: errorMessage });
    }
  };

  const resend = async () => {
    try {
      const response = await api<{ message: string }>("/auth/resend-verification", {
        method: "POST",
        body: JSON.stringify({ email })
      });
      setStatus("idle");
      setMessage(response.message);
      setToast({ type: "success", message: response.message });
    } catch (error) {
      setStatus("error");
      const errorMessage = getErrorMessage(error, "No se pudo reenviar el codigo.");
      setMessage(errorMessage);
      setToast({ type: "error", message: errorMessage });
    }
  };

  return (
    <form className="verification-form" onSubmit={submit}>
      <Toast toast={toast} onClose={() => setToast(null)} />
      <label>
        Email
        <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="tu@email.com" />
      </label>
      <label>
        Codigo de 4 digitos
        <input
          required
          inputMode="numeric"
          maxLength={4}
          minLength={4}
          pattern="[0-9]{4}"
          className="verification-code-input"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="0000"
        />
      </label>
      {message && <p className={status === "error" ? "form-message error" : "form-message success"}>{message}</p>}
      <div className="actions">
        <button>Validar cuenta</button>
        <button type="button" className="ghost" onClick={() => void resend()} disabled={!email}>Reenviar codigo</button>
      </div>
      {status === "success" && <Link className="button" to="/login">Iniciar sesion</Link>}
    </form>
  );
}
