import { Router } from "express";
import { body, param, query } from "express-validator";
import { Op, WhereOptions } from "sequelize";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Category, Product } from "../models/index.js";
import { makeSlug, toPublicProduct } from "../utils/formatters.js";

export const productsRouter = Router();

productsRouter.get(
  "/",
  query("category").optional().isInt(),
  query("min").optional().isFloat({ min: 0 }),
  query("max").optional().isFloat({ min: 0 }),
  query("search").optional().trim().escape(),
  validate,
  async (req, res) => {
    const where: WhereOptions = { activo: true };

    if (req.query.category) where.categoriaId = Number(req.query.category);
    if (req.query.min || req.query.max) {
      where.precioVenta = {
        ...(req.query.min ? { [Op.gte]: Number(req.query.min) } : {}),
        ...(req.query.max ? { [Op.lte]: Number(req.query.max) } : {})
      };
    }
    if (req.query.search) {
      where[Op.or as any] = [
        { nombre: { [Op.like]: `%${req.query.search}%` } },
        { descripcion: { [Op.like]: `%${req.query.search}%` } }
      ];
    }

    const products = await Product.findAll({
      where,
      include: [{ model: Category, as: "category" }],
      order: [["destacado", "DESC"], ["nombre", "ASC"]]
    });

    return res.json({ products: products.map(toPublicProduct) });
  }
);

productsRouter.get("/categories", async (_req, res) => {
  const categories = await Category.findAll({ where: { activo: true }, order: [["nombre", "ASC"]] });
  return res.json({ categories });
});

productsRouter.get("/:id", param("id").isInt(), validate, async (req, res) => {
  const product = await Product.findByPk(Number(req.params.id), { include: [{ model: Category, as: "category" }] });
  if (!product || !product.activo) {
    return res.status(404).json({ message: "Producto no encontrado" });
  }
  return res.json({ product: toPublicProduct(product) });
});

productsRouter.post(
  "/",
  authenticate,
  requireRole("admin"),
  body("nombre").trim().notEmpty(),
  body("precioVenta").isFloat({ min: 0 }),
  body("stockActual").isInt({ min: 0 }),
  body("categoriaId").optional({ nullable: true }).isInt(),
  body("imagenUrl").optional({ nullable: true }).isURL({ require_protocol: true }),
  validate,
  async (req, res) => {
    const product = await Product.create({
      ...req.body,
      precioCompra: req.body.precioCompra ?? 0,
      slug: makeSlug(req.body.nombre)
    });
    return res.status(201).json({ product: toPublicProduct(product) });
  }
);

productsRouter.put(
  "/:id",
  authenticate,
  requireRole("admin"),
  param("id").isInt(),
  body("nombre").optional().trim().notEmpty(),
  body("precioVenta").optional().isFloat({ min: 0 }),
  body("stockActual").optional().isInt({ min: 0 }),
  body("imagenUrl").optional({ nullable: true }).isURL({ require_protocol: true }),
  validate,
  async (req, res) => {
    const product = await Product.findByPk(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Producto no encontrado" });

    await product.update({
      ...req.body,
      slug: req.body.nombre ? makeSlug(req.body.nombre) : product.slug
    });
    return res.json({ product: toPublicProduct(product) });
  }
);
