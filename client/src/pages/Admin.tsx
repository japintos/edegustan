import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { AdminCustomer, AdminOrder, AdminProduct, Category } from "../types";

interface Stats {
  salesTotal: number;
  pendingOrders: number;
  lowStockProducts: number;
  revenue: number;
}

interface ProductForm {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  precioCompra: string;
  precioVenta: string;
  stockActual: string;
  stockMinimo: string;
  categoriaId: string;
  imagenUrl: string;
  activo: boolean;
  destacado: boolean;
}

type AdminSection = "dashboard" | "products" | "categories" | "orders" | "customers";

const emptyProductForm: ProductForm = {
  codigo: "",
  nombre: "",
  descripcion: "",
  precioCompra: "0",
  precioVenta: "",
  stockActual: "0",
  stockMinimo: "5",
  categoriaId: "",
  imagenUrl: "",
  activo: true,
  destacado: false
};

const orderStatuses = ["pendiente", "pagada", "preparando", "enviada", "entregada", "cancelada", "completada"];
const orderStatusFilters = ["todos", ...orderStatuses];
const money = (value: string | number) => Number(value).toLocaleString("es-AR");
const pickupPolicy =
  "Los pedidos no retirados dentro de las 72 hs se consideran desistidos. Si el pedido fue pagado por Mercado Pago o transferencia, no hay devolucion del dinero.";
const formatDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })
    : new Date().toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });

export function Admin() {
  const [section, setSection] = useState<AdminSection>("dashboard");
  const [stats, setStats] = useState<Stats>({ salesTotal: 0, pendingOrders: 0, lowStockProducts: 0, revenue: 0 });
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [orderFilter, setOrderFilter] = useState("todos");
  const [productForm, setProductForm] = useState<ProductForm>(emptyProductForm);
  const [categoryForm, setCategoryForm] = useState({ nombre: "", descripcion: "" });
  const [message, setMessage] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);

  const loadAdminData = useCallback(async () => {
    const [statsData, productsData, categoriesData, ordersData, customersData] = await Promise.all([
      api<{ stats: Stats }>("/admin/stats"),
      api<{ products: AdminProduct[] }>("/admin/products?active=all"),
      api<{ categories: Category[] }>("/admin/categories"),
      api<{ orders: AdminOrder[] }>("/admin/orders"),
      api<{ customers: AdminCustomer[] }>("/admin/customers")
    ]);

    setStats(statsData.stats);
    setProducts(productsData.products);
    setCategories(categoriesData.categories);
    setOrders(ordersData.orders);
    setCustomers(customersData.customers);
    setSelectedOrder((current) => (current ? ordersData.orders.find((order) => order.id === current.id) ?? null : null));
  }, []);

  useEffect(() => {
    // Admin data is loaded from the API when the module mounts.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAdminData();
  }, [loadAdminData]);

  const lowStock = useMemo(
    () => products.filter((product) => product.activo && product.stockActual <= product.stockMinimo),
    [products]
  );

  const visibleOrders = useMemo(
    () => (orderFilter === "todos" ? orders : orders.filter((order) => order.estado === orderFilter)),
    [orderFilter, orders]
  );

  const showMessage = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 3500);
  };

  const submitProduct = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload = {
      codigo: productForm.codigo || null,
      nombre: productForm.nombre,
      descripcion: productForm.descripcion || null,
      precioCompra: Number(productForm.precioCompra || 0),
      precioVenta: Number(productForm.precioVenta),
      stockActual: Number(productForm.stockActual || 0),
      stockMinimo: Number(productForm.stockMinimo || 0),
      categoriaId: productForm.categoriaId ? Number(productForm.categoriaId) : null,
      imagenUrl: productForm.imagenUrl || null,
      activo: productForm.activo,
      destacado: productForm.destacado
    };

    if (productForm.id) {
      await api(`/admin/products/${productForm.id}`, { method: "PUT", body: JSON.stringify(payload) });
      showMessage("Producto actualizado correctamente.");
    } else {
      await api("/admin/products", { method: "POST", body: JSON.stringify(payload) });
      showMessage("Producto creado correctamente.");
    }

    setProductForm(emptyProductForm);
    await loadAdminData();
  };

  const uploadProductImage = async (file: File) => {
    setUploadingImage(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await api<{ image: { url: string } }>("/admin/uploads/images", {
        method: "POST",
        body: formData
      });

      setProductForm((current) => ({ ...current, imagenUrl: response.image.url }));
      showMessage("Imagen subida a Cloudinary correctamente.");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
    }
  };

  const editProduct = (product: AdminProduct) => {
    setSection("products");
    setProductForm({
      id: product.id,
      codigo: product.codigo ?? "",
      nombre: product.nombre,
      descripcion: product.descripcion ?? "",
      precioCompra: String(product.precioCompra),
      precioVenta: String(product.precioVenta),
      stockActual: String(product.stockActual),
      stockMinimo: String(product.stockMinimo),
      categoriaId: product.categoriaId ? String(product.categoriaId) : "",
      imagenUrl: product.imagenUrl ?? "",
      activo: product.activo,
      destacado: product.destacado
    });
  };

  const toggleProduct = async (product: AdminProduct) => {
    await api(`/admin/products/${product.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ activo: !product.activo })
    });
    await loadAdminData();
  };

  const submitCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    await api("/admin/categories", { method: "POST", body: JSON.stringify(categoryForm) });
    setCategoryForm({ nombre: "", descripcion: "" });
    showMessage("Categoria creada correctamente.");
    await loadAdminData();
  };

  const updateOrderStatus = async (orderId: number, estado: string) => {
    const response = await api<{ order: AdminOrder }>(`/admin/orders/${orderId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ estado })
    });

    setOrders((current) => current.map((order) => (order.id === orderId ? response.order : order)));
    setSelectedOrder((current) => (current?.id === orderId ? response.order : current));
    const statsData = await api<{ stats: Stats }>("/admin/stats");
    setStats(statsData.stats);
  };

  const printSelectedOrder = () => {
    window.print();
  };

  const navItems: Array<{ id: AdminSection; label: string; hint: string }> = [
    { id: "dashboard", label: "Resumen", hint: "KPIs y alertas" },
    { id: "products", label: "Productos", hint: "Alta, edicion y stock" },
    { id: "categories", label: "Categorias", hint: "Organizacion del catalogo" },
    { id: "orders", label: "Pedidos", hint: "Estados y detalle" },
    { id: "customers", label: "Clientes", hint: "Datos de compra" }
  ];

  return (
    <section className="admin-shell">
      <aside className="admin-sidebar">
        <div>
          <p className="eyebrow">Administracion</p>
          <h1>Degustan</h1>
          <span>Panel operativo ecommerce</span>
        </div>
        <nav className="admin-side-nav" aria-label="Secciones administrativas">
          {navItems.map((item) => (
            <button key={item.id} className={section === item.id ? "active" : ""} onClick={() => setSection(item.id)}>
              <strong>{item.label}</strong>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>
      </aside>

      <div className="admin-content">
        <div className="admin-topbar">
          <div>
            <p className="eyebrow">Gestion ecommerce</p>
            <h2>{navItems.find((item) => item.id === section)?.label}</h2>
          </div>
          <button className="ghost admin-refresh" onClick={() => void loadAdminData()}>Actualizar datos</button>
        </div>

        {message && <p className="admin-message">{message}</p>}

        {section === "dashboard" && (
          <div className="admin-section">
            <div className="stats-grid">
              <article><span>Ventas web</span><strong>{stats.salesTotal}</strong></article>
              <article><span>Pendientes</span><strong>{stats.pendingOrders}</strong></article>
              <article><span>Stock bajo</span><strong>{stats.lowStockProducts}</strong></article>
              <article><span>Ingresos</span><strong>${money(stats.revenue)}</strong></article>
            </div>
            <div className="admin-split">
              <div className="admin-card">
                <p className="eyebrow">Alertas de stock</p>
                <h3>Productos con reposicion pendiente</h3>
                <div className="mini-list">
                  {lowStock.length === 0 && <p className="muted">No hay productos bajo stock minimo.</p>}
                  {lowStock.map((product) => (
                    <button key={product.id} onClick={() => editProduct(product)}>
                      <span>{product.nombre}</span>
                      <strong>{product.stockActual} / min {product.stockMinimo}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div className="admin-card">
                <p className="eyebrow">Ultimos pedidos</p>
                <h3>Actividad reciente</h3>
                <div className="mini-list">
                  {orders.slice(0, 5).map((order) => (
                    <button key={order.id} onClick={() => { setSelectedOrder(order); setSection("orders"); }}>
                      <span>Pedido #{order.id}</span>
                      <strong>{order.estado} - ${money(order.total)}</strong>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {section === "products" && (
          <div className="admin-section">
            <div className="admin-card">
              <p className="eyebrow">{productForm.id ? "Editar producto" : "Nuevo producto"}</p>
              <h3>{productForm.id ? productForm.nombre : "Cargar producto al catalogo"}</h3>
              <form className="admin-form" onSubmit={submitProduct}>
                <div className="form-row">
                  <label>Codigo<input value={productForm.codigo} onChange={(event) => setProductForm({ ...productForm, codigo: event.target.value })} /></label>
                  <label>Categoria
                    <select value={productForm.categoriaId} onChange={(event) => setProductForm({ ...productForm, categoriaId: event.target.value })}>
                      <option value="">Sin categoria</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                    </select>
                  </label>
                </div>
                <label>Nombre<input required value={productForm.nombre} onChange={(event) => setProductForm({ ...productForm, nombre: event.target.value })} /></label>
                <label>Descripcion<textarea value={productForm.descripcion} onChange={(event) => setProductForm({ ...productForm, descripcion: event.target.value })} /></label>
                <div className="form-row">
                  <label>Precio compra<input type="number" min="0" step="0.01" value={productForm.precioCompra} onChange={(event) => setProductForm({ ...productForm, precioCompra: event.target.value })} /></label>
                  <label>Precio venta<input required type="number" min="0" step="0.01" value={productForm.precioVenta} onChange={(event) => setProductForm({ ...productForm, precioVenta: event.target.value })} /></label>
                </div>
                <div className="form-row">
                  <label>Stock actual<input required type="number" min="0" value={productForm.stockActual} onChange={(event) => setProductForm({ ...productForm, stockActual: event.target.value })} /></label>
                  <label>Stock minimo<input type="number" min="0" value={productForm.stockMinimo} onChange={(event) => setProductForm({ ...productForm, stockMinimo: event.target.value })} /></label>
                </div>
                <div className={productForm.imagenUrl ? "image-upload-panel has-image" : "image-upload-panel"}>
                  <div>
                    <label>Imagen del producto
                      <input
                        type="file"
                        accept="image/*"
                        disabled={uploadingImage}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) void uploadProductImage(file);
                        }}
                      />
                    </label>
                    <small>
                      {uploadingImage
                        ? "Subiendo imagen..."
                        : productForm.imagenUrl
                          ? "Imagen cargada correctamente. La URL se guarda automaticamente."
                          : "Selecciona una imagen. La app la sube y guarda la referencia automaticamente."}
                    </small>
                  </div>
                  {productForm.imagenUrl && (
                    <div className="admin-image-preview-wrap">
                      <img className="admin-image-preview" src={productForm.imagenUrl} alt="Preview del producto" />
                      <button type="button" className="ghost small" onClick={() => setProductForm({ ...productForm, imagenUrl: "" })}>Quitar</button>
                    </div>
                  )}
                </div>
                <div className="check-row">
                  <label><input type="checkbox" checked={productForm.activo} onChange={(event) => setProductForm({ ...productForm, activo: event.target.checked })} /> Activo en catalogo</label>
                  <label><input type="checkbox" checked={productForm.destacado} onChange={(event) => setProductForm({ ...productForm, destacado: event.target.checked })} /> Destacado</label>
                </div>
                <div className="actions">
                  <button disabled={uploadingImage}>{uploadingImage ? "Esperando imagen..." : productForm.id ? "Guardar cambios" : "Crear producto"}</button>
                  {productForm.id && <button type="button" className="ghost" onClick={() => setProductForm(emptyProductForm)}>Cancelar edicion</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <p className="eyebrow">Inventario</p>
              <h3>Productos cargados</h3>
              <div className="admin-table">
                <div className="admin-table-head product-table">
                  <span>Producto</span><span>Categoria</span><span>Precio</span><span>Stock</span><span>Estado</span><span>Acciones</span>
                </div>
                {products.map((product) => (
                  <article className="admin-table-row product-table" key={product.id}>
                    <span><strong>{product.nombre}</strong><small>{product.codigo ?? "Sin codigo"}</small></span>
                    <span>{product.categoria ?? "Sin categoria"}</span>
                    <span>${money(product.precioVenta)}</span>
                    <span className={product.stockActual <= product.stockMinimo ? "stock-alert" : ""}>{product.stockActual} u.</span>
                    <span>{product.activo ? "Activo" : "Oculto"}</span>
                    <span className="row-actions">
                      <button className="small" onClick={() => editProduct(product)}>Editar</button>
                      <button className="ghost small" onClick={() => toggleProduct(product)}>{product.activo ? "Ocultar" : "Activar"}</button>
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "categories" && (
          <div className="admin-section">
            <div className="admin-card narrow-card">
              <p className="eyebrow">Nueva categoria</p>
              <h3>Organizar catalogo</h3>
              <form className="admin-form" onSubmit={submitCategory}>
                <label>Nombre<input required value={categoryForm.nombre} onChange={(event) => setCategoryForm({ ...categoryForm, nombre: event.target.value })} /></label>
                <label>Descripcion<textarea value={categoryForm.descripcion} onChange={(event) => setCategoryForm({ ...categoryForm, descripcion: event.target.value })} /></label>
                <button>Crear categoria</button>
              </form>
            </div>
            <div className="admin-card">
              <p className="eyebrow">Categorias actuales</p>
              <div className="category-list">
                {categories.map((category) => (
                  <article key={category.id}>
                    <strong>{category.nombre}</strong>
                    <span>{category.descripcion ?? "Sin descripcion"}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "orders" && (
          <div className="admin-section">
            <div className="admin-card">
              <p className="eyebrow">Pedidos web</p>
              <div className="admin-card-title">
                <h3>Estados y seguimiento</h3>
                <span>{visibleOrders.length} de {orders.length} pedidos</span>
              </div>
              <div className="order-filter-bar" aria-label="Filtrar pedidos por estado">
                {orderStatusFilters.map((status) => (
                  <button
                    key={status}
                    className={orderFilter === status ? "active" : ""}
                    onClick={() => setOrderFilter(status)}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="admin-table">
                <div className="admin-table-head order-table">
                  <span>Pedido</span><span>Cliente</span><span>Pago</span><span>Total</span><span>Estado</span><span>Acciones</span>
                </div>
                {visibleOrders.length === 0 && <p className="muted">No hay pedidos con este estado.</p>}
                {visibleOrders.map((order) => (
                  <article className="admin-table-row order-table" key={order.id}>
                    <span><strong>#{order.id}</strong><small>{order.numeroFactura}</small></span>
                    <span><strong>{order.customer?.nombre ?? order.emailContacto ?? "Cliente"}</strong><small>{order.emailContacto ?? order.customer?.email}</small></span>
                    <span>{order.metodoPago}<small>{order.payment?.estado ?? "pendiente"}</small></span>
                    <span>${money(order.total)}</span>
                    <span>
                      <select value={order.estado} onChange={(event) => updateOrderStatus(order.id, event.target.value)}>
                        {orderStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </span>
                    <span className="row-actions"><button className="small" onClick={() => setSelectedOrder(order)}>Ver detalle</button></span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {section === "customers" && (
          <div className="admin-section">
            <div className="admin-card">
              <p className="eyebrow">Clientes ecommerce</p>
              <h3>Datos de contacto y compra</h3>
              <div className="admin-table">
                <div className="admin-table-head customer-table">
                  <span>Cliente</span><span>Email</span><span>Telefono</span><span>Direccion</span><span>Estado</span>
                </div>
                {customers.map((customer) => (
                  <article className="admin-table-row customer-table" key={customer.id}>
                    <span><strong>{customer.nombre}</strong><small>{customer.documento ?? "Sin documento"}</small></span>
                    <span>{customer.email ?? "-"}</span>
                    <span>{customer.telefono ?? "-"}</span>
                    <span>{customer.direccion ?? "-"}</span>
                    <span>{customer.activo ? "Activo" : "Inactivo"}</span>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      {selectedOrder && (
        <div className="order-modal-backdrop" role="dialog" aria-modal="true" aria-label={`Detalle del pedido ${selectedOrder.id}`}>
          <div className="order-modal">
            <div className="order-modal-actions">
              <button className="ghost small" onClick={printSelectedOrder} type="button">Imprimir pedido</button>
              <button className="small" onClick={() => setSelectedOrder(null)} type="button">Cerrar</button>
            </div>
            <div className="order-print-area">
              <div className="remito-header">
                <div>
                  <p className="eyebrow">Remito ecommerce</p>
                  <h3>Degustan Drink-Store</h3>
                  <span>Pedido preparado desde el panel administrativo</span>
                </div>
                <div className="remito-number">
                  <strong>Pedido #{selectedOrder.id}</strong>
                  <span>{selectedOrder.numeroFactura ?? "Sin numero de factura"}</span>
                  <small>{formatDate(selectedOrder.created_at)}</small>
                </div>
              </div>

              <div className="remito-status-row">
                <span><strong>Estado del pedido:</strong> {selectedOrder.estado}</span>
                <span><strong>Metodo de pago:</strong> {selectedOrder.metodoPago}</span>
                <span><strong>Estado de pago:</strong> {selectedOrder.payment?.estado ?? "pendiente"}</span>
              </div>

              <div className="remito-info-grid">
                <section>
                  <h4>Datos del cliente</h4>
                  <p><strong>Nombre:</strong> {selectedOrder.customer?.nombre ?? selectedOrder.emailContacto ?? "-"}</p>
                  <p><strong>Email:</strong> {selectedOrder.emailContacto ?? selectedOrder.customer?.email ?? "-"}</p>
                  <p><strong>Telefono:</strong> {selectedOrder.telefonoContacto ?? selectedOrder.customer?.telefono ?? "-"}</p>
                  <p><strong>Direccion registrada:</strong> {selectedOrder.customer?.direccion ?? "-"}</p>
                </section>
                <section>
                  <h4>Entrega</h4>
                  <p><strong>Tipo:</strong> {selectedOrder.tipoEntrega === "retiro" ? "Retiro en local" : "Delivery"}</p>
                  <p><strong>Direccion:</strong> {selectedOrder.direccionEnvio ?? selectedOrder.customer?.direccion ?? "-"}</p>
                  <p><strong>Horario:</strong> 18:30 a 23:00 del dia del pedido</p>
                  <p><strong>Costo delivery:</strong> {selectedOrder.deliveryACargoComprador ? "A cargo del comprador" : "Incluido en la venta"}</p>
                </section>
              </div>

              <table className="remito-items">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio unitario</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                {selectedOrder.items?.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product?.nombre ?? "Producto"}</td>
                    <td>{item.cantidad}</td>
                    <td>${money(item.precioUnitario)}</td>
                    <td>${money(item.subtotal)}</td>
                  </tr>
                ))}
                </tbody>
              </table>

              <div className="remito-bottom">
                <section className="remito-observations">
                  <h4>Observaciones</h4>
                  <p>{selectedOrder.observaciones ?? "Sin observaciones adicionales."}</p>
                  {selectedOrder.tipoEntrega === "retiro" && <p className="remito-policy">{pickupPolicy}</p>}
                </section>
                <section className="remito-totals">
                  <p><span>Subtotal</span><strong>${money(selectedOrder.subtotal)}</strong></p>
                  <p><span>Costo de envio registrado</span><strong>${money(selectedOrder.costoEnvio)}</strong></p>
                  <p className="grand-total"><span>Total</span><strong>${money(selectedOrder.total)}</strong></p>
                </section>
              </div>

              <div className="remito-signatures">
                <span>Preparado por</span>
                <span>Recibido por</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
