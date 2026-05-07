import { Router } from "express";
import type { Response } from "express";
import { body, param, query } from "express-validator";
import multer from "multer";
import { Op, fn, col, literal } from "sequelize";
import { AuthRequest, authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Category, Customer, PaymentTransaction, Product, Sale, SaleItem, StockMovement } from "../models/index.js";
import { uploadImageBuffer } from "../services/cloudinaryService.js";
import { makeSlug } from "../utils/formatters.js";

export const adminRouter = Router();

adminRouter.use(authenticate, requireRole("admin"));

const orderStatuses = ["pendiente", "pagada", "preparando", "enviada", "entregada", "cancelada", "completada"] as const;
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Solo se permiten imagenes"));
      return;
    }

    callback(null, true);
  }
});

const productPayload = (product: Product) => ({
  id: product.id,
  codigo: product.codigo,
  nombre: product.nombre,
  slug: product.slug,
  descripcion: product.descripcion,
  precioCompra: Number(product.precioCompra),
  precioVenta: Number(product.precioVenta),
  stockActual: product.stockActual,
  stockMinimo: product.stockMinimo,
  categoriaId: product.categoriaId,
  categoria: product.category?.nombre ?? null,
  imagenUrl: product.imagenUrl,
  activo: Boolean(product.activo),
  destacado: Boolean(product.destacado)
});

const productValidation = [
  body("codigo").optional({ nullable: true, checkFalsy: true }).trim().isLength({ max: 50 }),
  body("nombre").trim().notEmpty(),
  body("descripcion").optional({ nullable: true }).trim(),
  body("precioCompra").optional().isFloat({ min: 0 }),
  body("precioVenta").isFloat({ min: 0 }),
  body("stockActual").isInt({ min: 0 }),
  body("stockMinimo").optional().isInt({ min: 0 }),
  body("categoriaId").optional({ nullable: true, checkFalsy: true }).isInt(),
  body("imagenUrl").optional({ nullable: true, checkFalsy: true }).isURL({ require_protocol: true }),
  body("activo").optional().isBoolean(),
  body("destacado").optional().isBoolean()
];

adminRouter.get("/stats", async (_req, res) => {
  const [salesTotal, pendingOrders, lowStockProducts, revenue] = await Promise.all([
    Sale.count({ where: { origen: "web" } }),
    Sale.count({ where: { origen: "web", estado: "pendiente" } }),
    Product.count({ where: literal("stock_actual <= stock_minimo AND activo = 1") as any }),
    Sale.findOne({
      attributes: [[fn("COALESCE", fn("SUM", col("total")), 0), "total"]],
      where: { origen: "web", estado: { [Op.in]: ["pagada", "completada", "entregada"] } },
      raw: true
    })
  ]);

  return res.json({
    stats: {
      salesTotal,
      pendingOrders,
      lowStockProducts,
      revenue: Number((revenue as any)?.total ?? 0)
    }
  });
});

adminRouter.post("/uploads/images", imageUpload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(422).json({ message: "Imagen requerida" });
  }

  try {
    const result = await uploadImageBuffer(req.file.buffer, req.file.originalname);
    return res.status(201).json({
      image: {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format
      }
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "No se pudo subir la imagen" });
  }
});

adminRouter.get("/categories", async (_req, res) => {
  const categories = await Category.findAll({ order: [["nombre", "ASC"]] });
  return res.json({ categories });
});

adminRouter.post(
  "/categories",
  body("nombre").trim().notEmpty(),
  body("descripcion").optional({ nullable: true }).trim(),
  validate,
  async (req, res) => {
    const category = await Category.create({
      nombre: req.body.nombre,
      descripcion: req.body.descripcion ?? null,
      activo: true
    });

    return res.status(201).json({ category });
  }
);

adminRouter.get(
  "/products",
  query("search").optional().trim(),
  query("active").optional().isIn(["all", "true", "false"]),
  validate,
  async (req, res) => {
    const where: Record<string, unknown> = {};

    if (req.query.active === "true") where.activo = true;
    if (req.query.active === "false") where.activo = false;
    if (req.query.search) {
      where[Op.or as unknown as string] = [
        { nombre: { [Op.like]: `%${req.query.search}%` } },
        { codigo: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: "category" }],
      order: [["updated_at", "DESC"]]
    });

    return res.json({ products: products.map(productPayload) });
  }
);

adminRouter.post(
  "/products",
  productValidation,
  validate,
  async (req: AuthRequest, res: Response) => {
    const product = await Product.create({
      codigo: req.body.codigo || null,
      nombre: req.body.nombre,
      slug: makeSlug(req.body.nombre),
      descripcion: req.body.descripcion || null,
      precioCompra: req.body.precioCompra ?? 0,
      precioVenta: req.body.precioVenta,
      stockActual: req.body.stockActual,
      stockMinimo: req.body.stockMinimo ?? 5,
      categoriaId: req.body.categoriaId || null,
      imagenUrl: req.body.imagenUrl || null,
      activo: req.body.activo ?? true,
      destacado: req.body.destacado ?? false
    } as any);

    if (product.stockActual > 0) {
      await StockMovement.create({
        productoId: product.id,
        tipo: "entrada",
        cantidad: product.stockActual,
        cantidadAnterior: 0,
        cantidadNueva: product.stockActual,
        motivo: "Alta de producto ecommerce",
        usuarioId: req.user!.id,
        referencia: product.codigo ?? `P${product.id}`
      });
    }

    const withCategory = await Product.findByPk(product.id, { include: [{ model: Category, as: "category" }] });
    return res.status(201).json({ product: productPayload(withCategory!) });
  }
);

adminRouter.put(
  "/products/:id",
  param("id").isInt(),
  productValidation.map((validator) => validator.optional({ nullable: true })),
  validate,
  async (req: AuthRequest, res: Response) => {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    const previousStock = product.stockActual;
    const nextStock = req.body.stockActual !== undefined ? Number(req.body.stockActual) : previousStock;

    await product.update({
      codigo: req.body.codigo !== undefined ? req.body.codigo || null : product.codigo,
      nombre: req.body.nombre ?? product.nombre,
      slug: req.body.nombre ? makeSlug(req.body.nombre) : product.slug,
      descripcion: req.body.descripcion !== undefined ? req.body.descripcion || null : product.descripcion,
      precioCompra: req.body.precioCompra ?? product.precioCompra,
      precioVenta: req.body.precioVenta ?? product.precioVenta,
      stockActual: nextStock,
      stockMinimo: req.body.stockMinimo ?? product.stockMinimo,
      categoriaId: req.body.categoriaId !== undefined ? req.body.categoriaId || null : product.categoriaId,
      imagenUrl: req.body.imagenUrl !== undefined ? req.body.imagenUrl || null : product.imagenUrl,
      activo: req.body.activo ?? product.activo,
      destacado: req.body.destacado ?? product.destacado
    } as any);

    if (nextStock !== previousStock) {
      await StockMovement.create({
        productoId: product.id,
        tipo: "ajuste",
        cantidad: Math.abs(nextStock - previousStock),
        cantidadAnterior: previousStock,
        cantidadNueva: nextStock,
        motivo: "Ajuste administrativo ecommerce",
        usuarioId: req.user!.id,
        referencia: product.codigo ?? `P${product.id}`
      });
    }

    const withCategory = await Product.findByPk(product.id, { include: [{ model: Category, as: "category" }] });
    return res.json({ product: productPayload(withCategory!) });
  }
);

adminRouter.patch(
  "/products/:id/status",
  param("id").isInt(),
  body("activo").isBoolean(),
  validate,
  async (req, res) => {
    const product = await Product.findByPk(Number(req.params.id), { include: [{ model: Category, as: "category" }] });
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    await product.update({ activo: req.body.activo });
    return res.json({ product: productPayload(product) });
  }
);

adminRouter.get("/orders", async (_req, res) => {
  const orders = await Sale.findAll({
    where: { origen: "web" },
    include: [
      { model: Customer, as: "customer" },
      { model: PaymentTransaction, as: "payment" },
      { model: SaleItem, as: "items", include: [{ model: Product, as: "product" }] }
    ],
    order: [["created_at", "DESC"]]
  });

  return res.json({ orders });
});

adminRouter.get("/customers", async (_req, res) => {
  const customers = await Customer.findAll({
    order: [["updated_at", "DESC"]]
  });

  return res.json({ customers });
});

adminRouter.get("/orders/:id", param("id").isInt(), validate, async (req, res) => {
  const order = await Sale.findOne({
    where: { id: req.params.id, origen: "web" },
    include: [
      { model: Customer, as: "customer" },
      { model: PaymentTransaction, as: "payment" },
      { model: SaleItem, as: "items", include: [{ model: Product, as: "product" }] }
    ]
  });

  if (!order) return res.status(404).json({ message: "Pedido no encontrado" });
  return res.json({ order });
});

adminRouter.patch(
  "/orders/:id/status",
  param("id").isInt(),
  body("estado").isIn(orderStatuses),
  body("paymentEstado").optional().isIn(["pendiente", "aprobado", "rechazado", "cancelado"]),
  validate,
  async (req, res) => {
    const order = await Sale.findOne({
      where: { id: req.params.id, origen: "web" },
      include: [{ model: PaymentTransaction, as: "payment" }]
    });

    if (!order) return res.status(404).json({ message: "Pedido no encontrado" });

    await order.update({ estado: req.body.estado });
    if (req.body.paymentEstado && order.payment) {
      await order.payment.update({ estado: req.body.paymentEstado });
    }

    const updated = await Sale.findByPk(order.id, {
      include: [
        { model: Customer, as: "customer" },
        { model: PaymentTransaction, as: "payment" },
        { model: SaleItem, as: "items", include: [{ model: Product, as: "product" }] }
      ]
    });

    return res.json({ order: updated });
  }
);
