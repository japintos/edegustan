import { Router } from "express";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { sendContactEmail } from "../utils/mailer.js";

export const contactRouter = Router();

contactRouter.post(
  "/",
  body("name").trim().notEmpty(),
  body("email").isEmail().normalizeEmail(),
  body("message").trim().isLength({ min: 10 }),
  validate,
  async (req, res) => {
    await sendContactEmail(req.body.email, req.body.name, req.body.message);
    return res.status(202).json({ message: "Consulta enviada" });
  }
);
