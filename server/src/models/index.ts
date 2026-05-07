import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../config/database.js";

export class Role extends Model {
  declare id: number;
  declare nombre: string;
}

Role.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    descripcion: DataTypes.TEXT,
    permisos: DataTypes.JSON
  },
  { sequelize, tableName: "roles" }
);

type UserCreation = Optional<UserAttributes, "id" | "activo" | "emailVerificado">;

export interface UserAttributes {
  id: number;
  username: string;
  password: string;
  email: string | null;
  emailVerificado: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  nombre: string;
  apellido: string;
  telefono?: string | null;
  direccion?: string | null;
  perfilImagenUrl?: string | null;
  rolId: number;
  activo: boolean;
}

export class User extends Model<UserAttributes, UserCreation> implements UserAttributes {
  declare id: number;
  declare username: string;
  declare password: string;
  declare email: string | null;
  declare emailVerificado: boolean;
  declare emailVerificationToken: string | null;
  declare emailVerificationExpires: Date | null;
  declare nombre: string;
  declare apellido: string;
  declare telefono: string | null;
  declare direccion: string | null;
  declare perfilImagenUrl: string | null;
  declare rolId: number;
  declare activo: boolean;
  declare role?: Role;
  declare customer?: Customer;
}

User.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(100), unique: true },
    emailVerificado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: "email_verificado" },
    emailVerificationToken: { type: DataTypes.STRING(255), field: "email_verification_token" },
    emailVerificationExpires: { type: DataTypes.DATE, field: "email_verification_expires" },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    apellido: { type: DataTypes.STRING(100), allowNull: false },
    telefono: DataTypes.STRING(30),
    direccion: DataTypes.TEXT,
    perfilImagenUrl: { type: DataTypes.STRING(500), field: "perfil_imagen_url" },
    rolId: { type: DataTypes.INTEGER, allowNull: false, field: "rol_id" },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true }
  },
  { sequelize, tableName: "usuarios" }
);

export class Category extends Model {
  declare id: number;
  declare nombre: string;
  declare descripcion: string | null;
}

Category.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    nombre: { type: DataTypes.STRING(100), allowNull: false },
    descripcion: DataTypes.TEXT,
    activo: DataTypes.BOOLEAN
  },
  { sequelize, tableName: "categorias" }
);

export class Product extends Model {
  declare id: number;
  declare codigo: string | null;
  declare nombre: string;
  declare slug: string | null;
  declare descripcion: string | null;
  declare precioCompra: string;
  declare precioVenta: string;
  declare stockActual: number;
  declare stockMinimo: number;
  declare categoriaId: number | null;
  declare imagenUrl: string | null;
  declare activo: boolean;
  declare destacado: boolean;
  declare category?: Category;
}

Product.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    codigo: DataTypes.STRING(50),
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    slug: DataTypes.STRING(220),
    descripcion: DataTypes.TEXT,
    precioCompra: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "precio_compra" },
    precioVenta: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "precio_venta" },
    stockActual: { type: DataTypes.INTEGER, defaultValue: 0, field: "stock_actual" },
    stockMinimo: { type: DataTypes.INTEGER, defaultValue: 5, field: "stock_minimo" },
    categoriaId: { type: DataTypes.INTEGER, field: "categoria_id" },
    proveedorId: { type: DataTypes.INTEGER, field: "proveedor_id" },
    imagenUrl: { type: DataTypes.STRING(255), field: "imagen_url" },
    activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    destacado: { type: DataTypes.BOOLEAN, defaultValue: false }
  },
  { sequelize, tableName: "productos" }
);

export class Customer extends Model {
  declare id: number;
  declare usuarioId: number | null;
  declare nombre: string;
  declare email: string | null;
  declare telefono: string | null;
  declare direccion: string | null;
}

Customer.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuarioId: { type: DataTypes.INTEGER, field: "usuario_id" },
    nombre: { type: DataTypes.STRING(200), allowNull: false },
    email: DataTypes.STRING(100),
    telefono: DataTypes.STRING(20),
    direccion: DataTypes.TEXT,
    documento: DataTypes.STRING(20),
    activo: DataTypes.BOOLEAN
  },
  { sequelize, tableName: "clientes" }
);

export class Cart extends Model {
  declare id: number;
  declare usuarioId: number;
  declare estado: "activo" | "convertido" | "abandonado";
  declare items?: CartItem[];
}

Cart.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: "usuario_id" },
    estado: { type: DataTypes.ENUM("activo", "convertido", "abandonado"), defaultValue: "activo" }
  },
  { sequelize, tableName: "carritos" }
);

export class CartItem extends Model {
  declare id: number;
  declare carritoId: number;
  declare productoId: number;
  declare cantidad: number;
  declare precioUnitario: string;
  declare product?: Product;
}

CartItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    carritoId: { type: DataTypes.INTEGER, allowNull: false, field: "carrito_id" },
    productoId: { type: DataTypes.INTEGER, allowNull: false, field: "producto_id" },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    precioUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "precio_unitario" }
  },
  { sequelize, tableName: "carrito_items" }
);

export class Sale extends Model {
  declare id: number;
  declare numeroFactura: string | null;
  declare origen: "local" | "web";
  declare clienteId: number | null;
  declare usuarioId: number;
  declare cajaId: number | null;
  declare subtotal: string;
  declare costoEnvio: string;
  declare total: string;
  declare metodoPago: "efectivo" | "tarjeta" | "transferencia" | "mercadopago";
  declare estado: string;
  declare direccionEnvio: string | null;
  declare emailContacto: string | null;
  declare telefonoContacto: string | null;
  declare tipoEntrega: "delivery" | "retiro";
  declare entregaDesde: Date | null;
  declare entregaHasta: Date | null;
  declare deliveryACargoComprador: boolean;
  declare items?: SaleItem[];
  declare payment?: PaymentTransaction;
}

Sale.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    numeroFactura: { type: DataTypes.STRING(20), field: "numero_factura" },
    origen: { type: DataTypes.ENUM("local", "web"), defaultValue: "web" },
    clienteId: { type: DataTypes.INTEGER, field: "cliente_id" },
    usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: "usuario_id" },
    cajaId: { type: DataTypes.INTEGER, field: "caja_id" },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    descuento: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
    costoEnvio: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0, field: "costo_envio" },
    total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    metodoPago: { type: DataTypes.ENUM("efectivo", "tarjeta", "transferencia", "mercadopago"), field: "metodo_pago" },
    estado: DataTypes.STRING,
    direccionEnvio: { type: DataTypes.TEXT, field: "direccion_envio" },
    emailContacto: { type: DataTypes.STRING(120), field: "email_contacto" },
    telefonoContacto: { type: DataTypes.STRING(30), field: "telefono_contacto" },
    tipoEntrega: { type: DataTypes.ENUM("delivery", "retiro"), defaultValue: "delivery", field: "tipo_entrega" },
    entregaDesde: { type: DataTypes.DATE, field: "entrega_desde" },
    entregaHasta: { type: DataTypes.DATE, field: "entrega_hasta" },
    deliveryACargoComprador: { type: DataTypes.BOOLEAN, defaultValue: true, field: "delivery_a_cargo_comprador" },
    observaciones: DataTypes.TEXT
  },
  { sequelize, tableName: "ventas" }
);

export class SaleItem extends Model {
  declare id: number;
}

SaleItem.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tipo: { type: DataTypes.ENUM("producto", "combo"), defaultValue: "producto" },
    ventaId: { type: DataTypes.INTEGER, allowNull: false, field: "venta_id" },
    productoId: { type: DataTypes.INTEGER, field: "producto_id" },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    precioUnitario: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: "precio_unitario" },
    subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
  },
  { sequelize, tableName: "detalles_venta", updatedAt: false }
);

export class StockMovement extends Model {}

StockMovement.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    productoId: { type: DataTypes.INTEGER, allowNull: false, field: "producto_id" },
    tipo: { type: DataTypes.ENUM("entrada", "salida", "ajuste"), allowNull: false },
    cantidad: { type: DataTypes.INTEGER, allowNull: false },
    cantidadAnterior: { type: DataTypes.INTEGER, allowNull: false, field: "cantidad_anterior" },
    cantidadNueva: { type: DataTypes.INTEGER, allowNull: false, field: "cantidad_nueva" },
    motivo: DataTypes.STRING(200),
    usuarioId: { type: DataTypes.INTEGER, allowNull: false, field: "usuario_id" },
    referencia: DataTypes.STRING(100)
  },
  { sequelize, tableName: "movimientos_stock", updatedAt: false }
);

export class PaymentTransaction extends Model {
  declare id: number;
  declare ventaId: number;
  declare proveedor: "transferencia" | "mercadopago" | "efectivo";
  declare estado: "pendiente" | "aprobado" | "rechazado" | "cancelado";
  declare checkoutUrl: string | null;
}

PaymentTransaction.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ventaId: { type: DataTypes.INTEGER, allowNull: false, field: "venta_id" },
    proveedor: { type: DataTypes.ENUM("transferencia", "mercadopago", "efectivo"), allowNull: false },
    estado: { type: DataTypes.ENUM("pendiente", "aprobado", "rechazado", "cancelado"), defaultValue: "pendiente" },
    monto: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    referenciaExterna: { type: DataTypes.STRING(255), field: "referencia_externa" },
    checkoutUrl: { type: DataTypes.STRING(500), field: "checkout_url" },
    payload: DataTypes.JSON
  },
  { sequelize, tableName: "transacciones_pago" }
);

User.belongsTo(Role, { as: "role", foreignKey: "rolId" });
User.hasOne(Customer, { as: "customer", foreignKey: "usuarioId" });
Customer.belongsTo(User, { as: "user", foreignKey: "usuarioId" });
Product.belongsTo(Category, { as: "category", foreignKey: "categoriaId" });
Cart.belongsTo(User, { foreignKey: "usuarioId" });
Cart.hasMany(CartItem, { as: "items", foreignKey: "carritoId" });
CartItem.belongsTo(Product, { as: "product", foreignKey: "productoId" });
Sale.belongsTo(User, { foreignKey: "usuarioId" });
Sale.belongsTo(Customer, { as: "customer", foreignKey: "clienteId" });
Sale.hasMany(SaleItem, { as: "items", foreignKey: "ventaId" });
Sale.hasOne(PaymentTransaction, { as: "payment", foreignKey: "ventaId" });
SaleItem.belongsTo(Product, { as: "product", foreignKey: "productoId" });

export const initDatabase = async () => {
  await sequelize.authenticate();
};
