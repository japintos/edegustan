import { Router } from "express";
import { body, param } from "express-validator";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { CartItem, Product } from "../models/index.js";
import { cartSummary, getActiveCart } from "../services/cartService.js";

export const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get("/", async (req: AuthRequest, res) => {
  const cart = await getActiveCart(req.user!.id);
  return res.json({ cart: cartSummary(cart) });
});

cartRouter.post(
  "/items",
  body("productoId").isInt(),
  body("cantidad").isInt({ min: 1 }),
  validate,
  async (req: AuthRequest, res) => {
    const product = await Product.findByPk(req.body.productoId);
    if (!product || !product.activo) return res.status(404).json({ message: "Producto no encontrado" });
    if (product.stockActual < req.body.cantidad) return res.status(409).json({ message: "Stock insuficiente" });

    const cart = await getActiveCart(req.user!.id);
    const [item, created] = await CartItem.findOrCreate({
      where: { carritoId: cart!.id, productoId: product.id },
      defaults: {
        carritoId: cart!.id,
        productoId: product.id,
        cantidad: req.body.cantidad,
        precioUnitario: product.precioVenta
      }
    });

    if (!created) {
      const nextQuantity = item.cantidad + Number(req.body.cantidad);
      if (product.stockActual < nextQuantity) return res.status(409).json({ message: "Stock insuficiente" });
      await item.update({ cantidad: nextQuantity, precioUnitario: product.precioVenta });
    }

    const updated = await getActiveCart(req.user!.id);
    return res.status(201).json({ cart: cartSummary(updated) });
  }
);

cartRouter.put(
  "/items/:id",
  param("id").isInt(),
  body("cantidad").isInt({ min: 1 }),
  validate,
  async (req: AuthRequest, res) => {
    const cart = await getActiveCart(req.user!.id);
    const item = await CartItem.findOne({ where: { id: req.params.id, carritoId: cart!.id }, include: [{ model: Product, as: "product" }] });
    if (!item) return res.status(404).json({ message: "Item no encontrado" });
    if (item.product && item.product.stockActual < req.body.cantidad) return res.status(409).json({ message: "Stock insuficiente" });

    await item.update({ cantidad: req.body.cantidad });
    const updated = await getActiveCart(req.user!.id);
    return res.json({ cart: cartSummary(updated) });
  }
);

cartRouter.delete("/items/:id", param("id").isInt(), validate, async (req: AuthRequest, res) => {
  const cart = await getActiveCart(req.user!.id);
  await CartItem.destroy({ where: { id: req.params.id, carritoId: cart!.id } });
  const updated = await getActiveCart(req.user!.id);
  return res.json({ cart: cartSummary(updated) });
});
