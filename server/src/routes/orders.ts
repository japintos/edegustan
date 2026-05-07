import { Router } from "express";
import { body } from "express-validator";
import { authenticate, AuthRequest } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Product, Sale, SaleItem, PaymentTransaction } from "../models/index.js";
import { createOrderFromCart } from "../services/checkoutService.js";
import { env } from "../config/env.js";

export const ordersRouter = Router();

ordersRouter.use(authenticate);

ordersRouter.post(
  "/checkout",
  body("paymentMethod").isIn(["transferencia", "mercadopago", "efectivo"]),
  body("shipping.tipoEntrega").isIn(["delivery", "retiro"]),
  body("paymentMethod").custom((paymentMethod, { req }) => {
    if (paymentMethod === "efectivo" && req.body.shipping?.tipoEntrega !== "retiro") {
      throw new Error("El pago en efectivo solo esta disponible para retiro en local");
    }
    return true;
  }),
  body("shipping.direccion").if(body("shipping.tipoEntrega").equals("delivery")).trim().notEmpty(),
  body("shipping.email").optional().isEmail(),
  validate,
  async (req: AuthRequest, res) => {
    try {
      const { sale, checkoutUrl } = await createOrderFromCart(req.user!.id, req.body.paymentMethod, req.body.shipping);
      return res.status(201).json({
        order: {
          id: sale.id,
          total: Number(sale.total),
          estado: sale.estado,
          metodoPago: sale.metodoPago,
          tipoEntrega: sale.tipoEntrega,
          entregaDesde: sale.entregaDesde,
          entregaHasta: sale.entregaHasta,
          deliveryACargoComprador: sale.deliveryACargoComprador,
          checkoutUrl,
          bank: req.body.paymentMethod === "transferencia" ? env.bank : null
        }
      });
    } catch (error) {
      return res.status(409).json({ message: error instanceof Error ? error.message : "No se pudo crear el pedido" });
    }
  }
);

ordersRouter.get("/", async (req: AuthRequest, res) => {
  const orders = await Sale.findAll({
    where: { usuarioId: req.user!.id, origen: "web" },
    include: [
      { model: SaleItem, as: "items", include: [{ model: Product, as: "product" }] },
      { model: PaymentTransaction, as: "payment" }
    ],
    order: [["created_at", "DESC"]]
  });

  return res.json({ orders });
});
