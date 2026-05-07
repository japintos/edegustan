const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const getToken = () => localStorage.getItem("degustan_token");
export const setToken = (token: string) => localStorage.setItem("degustan_token", token);
export const clearToken = () => localStorage.removeItem("degustan_token");

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message ?? "Error de API");
  }

  return data as T;
}
