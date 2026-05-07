export interface User {
  id: number;
  email: string;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  direccion?: string | null;
  perfilImagenUrl?: string | null;
  role: string;
  emailVerificado: boolean;
}

export interface Product {
  id: number;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  stockMinimo: number;
  categoriaId: number | null;
  categoria: string | null;
  imagenUrl: string | null;
  destacado: boolean;
}

export interface Category {
  id: number;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface CartItem {
  id: number;
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  product: Product;
}

export interface Cart {
  id?: number;
  items: CartItem[];
  total: number;
}

export interface Order {
  id: number;
  total: number;
  estado: string;
  metodoPago: string;
  tipoEntrega?: "delivery" | "retiro";
  entregaDesde?: string | null;
  entregaHasta?: string | null;
  deliveryACargoComprador?: boolean;
  checkoutUrl?: string | null;
  bank?: {
    holder: string;
    cbu: string;
    alias: string;
    bank: string;
  } | null;
}

export interface AdminProduct {
  id: number;
  codigo: string | null;
  nombre: string;
  slug: string | null;
  descripcion: string | null;
  precioCompra: number;
  precioVenta: number;
  stockActual: number;
  stockMinimo: number;
  categoriaId: number | null;
  categoria: string | null;
  imagenUrl: string | null;
  activo: boolean;
  destacado: boolean;
}

export interface AdminOrderItem {
  id: number;
  cantidad: number;
  precioUnitario: string | number;
  subtotal: string | number;
  product?: {
    id: number;
    nombre: string;
    imagenUrl?: string | null;
  } | null;
}

export interface AdminOrder {
  id: number;
  numeroFactura: string | null;
  estado: string;
  metodoPago: string;
  subtotal: string | number;
  costoEnvio: string | number;
  total: string | number;
  direccionEnvio?: string | null;
  emailContacto?: string | null;
  telefonoContacto?: string | null;
  tipoEntrega?: "delivery" | "retiro";
  entregaDesde?: string | null;
  entregaHasta?: string | null;
  deliveryACargoComprador?: boolean;
  observaciones?: string | null;
  created_at?: string;
  customer?: {
    nombre: string;
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
  } | null;
  payment?: {
    proveedor: string;
    estado: string;
    monto: string | number;
    referenciaExterna?: string | null;
    checkoutUrl?: string | null;
  } | null;
  items?: AdminOrderItem[];
}

export interface AdminCustomer {
  id: number;
  nombre: string;
  email?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  documento?: string | null;
  activo?: boolean;
  created_at?: string;
  updated_at?: string;
}
