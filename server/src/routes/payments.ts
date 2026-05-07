import { Router } from "express";
import { PaymentTransaction, Sale } from "../models/index.js";

export const paymentsRouter = Router();

paymentsRouter.post("/mercadopago/webhook", async (req, res) => {
  const payload = req.body;
  const reference = payload?.data?.id ?? payload?.id;

  if (reference) {
    const tx = await PaymentTransaction.findOne({ where: { referenciaExterna: String(reference) } });
    if (tx) {
      await tx.update({ estado: "aprobado", payload });
      await Sale.update({ estado: "pagada" }, { where: { id: tx.ventaId } });
    }
  }

  return res.sendStatus(200);
});
