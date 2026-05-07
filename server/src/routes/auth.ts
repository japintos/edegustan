import { Router } from "express";
import { body, query } from "express-validator";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import multer from "multer";
import { Op } from "sequelize";
import { authenticate, AuthRequest, signToken } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { Customer, Role, User } from "../models/index.js";
import { uploadImageBuffer } from "../services/cloudinaryService.js";
import { sendVerificationEmail } from "../utils/mailer.js";

export const authRouter = Router();

const userPayload = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  nombre: user.nombre,
  apellido: user.apellido,
  telefono: user.telefono,
  direccion: user.direccion,
    perfilImagenUrl: user.perfilImagenUrl,
    clienteId: user.customer?.id ?? null,
  emailVerificado: user.emailVerificado,
  role: user.role?.nombre ?? "cliente"
});

const generateVerificationCode = () => crypto.randomInt(1000, 10000).toString();
const profileImageUpload = multer({
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

authRouter.post(
  "/register",
  body("email").isEmail().normalizeEmail(),
  body("password").isLength({ min: 8 }),
  body("nombre").trim().notEmpty(),
  body("apellido").trim().notEmpty(),
  validate,
  async (req, res) => {
    const { email, password, nombre, apellido, telefono, direccion } = req.body;
    const exists = await User.findOne({ where: { [Op.or]: [{ email }, { username: email }] } });

    if (exists) {
      return res.status(409).json({ message: "El email ya esta registrado" });
    }

    const role = await Role.findOne({ where: { nombre: "cliente" } });
    if (!role) {
      return res.status(500).json({ message: "Falta ejecutar database/ecommerce_update.sql" });
    }

    const code = generateVerificationCode();
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: email,
      email,
      password: hashed,
      nombre,
      apellido,
      telefono,
      direccion,
      rolId: role.id,
      activo: true,
      emailVerificado: false,
      emailVerificationToken: code,
      emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });

    await sendVerificationEmail(email, code);
    user.role = role;
    const [customer] = await Customer.findOrCreate({
      where: { email },
      defaults: {
        usuarioId: user.id,
        nombre: `${nombre} ${apellido}`,
        email,
        telefono: telefono ?? null,
        direccion: direccion ?? null,
        activo: true
      }
    });
    if (!customer.usuarioId) {
      await customer.update({
        usuarioId: user.id,
        nombre: customer.nombre || `${nombre} ${apellido}`,
        telefono: customer.telefono ?? telefono ?? null,
        direccion: customer.direccion ?? direccion ?? null
      });
    }
    user.customer = customer;

    return res.status(201).json({
      message: "Cuenta creada. Te enviamos un codigo de 4 digitos para confirmar tu correo.",
      user: userPayload(user)
    });
  }
);

authRouter.post(
  "/verify-email",
  body("email").isEmail().normalizeEmail(),
  body("code").isLength({ min: 4, max: 4 }).isNumeric(),
  validate,
  async (req, res) => {
    const user = await User.findOne({
      where: {
        email: req.body.email,
        emailVerificationToken: req.body.code,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Codigo invalido o vencido" });
    }

    await user.update({
      emailVerificado: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    return res.json({ message: "Email verificado correctamente" });
  }
);

authRouter.post(
  "/login",
  body("email").isEmail().normalizeEmail(),
  body("password").notEmpty(),
  validate,
  async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({
      where: { [Op.or]: [{ email }, { username: email }], activo: true },
      include: [{ model: Role, as: "role" }, { model: Customer, as: "customer" }]
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Credenciales invalidas" });
    }

    if (user.role?.nombre === "cliente" && !user.emailVerificado) {
      return res.status(403).json({ message: "Debes verificar tu correo antes de iniciar sesion" });
    }

    await user.update({ ultimo_login: new Date() } as any);
    return res.json({ token: signToken(user), user: userPayload(user) });
  }
);

authRouter.get(
  "/verify-email",
  query("token").notEmpty(),
  validate,
  async (req, res) => {
    const token = String(req.query.token);
    const user = await User.findOne({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: { [Op.gt]: new Date() }
      }
    });

    if (!user) {
      return res.status(400).json({ message: "Token invalido o vencido" });
    }

    await user.update({
      emailVerificado: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    return res.json({ message: "Email verificado correctamente" });
  }
);

authRouter.post(
  "/resend-verification",
  body("email").isEmail().normalizeEmail(),
  validate,
  async (req, res) => {
    const user = await User.findOne({ where: { email: req.body.email, activo: true } });

    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    if (user.emailVerificado) {
      return res.json({ message: "El correo ya esta verificado" });
    }

    const code = generateVerificationCode();
    await user.update({
      emailVerificationToken: code,
      emailVerificationExpires: new Date(Date.now() + 1000 * 60 * 60 * 24)
    });
    await sendVerificationEmail(req.body.email, code);

    return res.json({ message: "Te enviamos un nuevo codigo de verificacion" });
  }
);

authRouter.get("/me", authenticate, async (req: AuthRequest, res) => {
  const user = await User.findByPk(req.user!.id, { include: [{ model: Role, as: "role" }, { model: Customer, as: "customer" }] });
  return res.json({ user: user ? userPayload(user) : null });
});

authRouter.put(
  "/me",
  authenticate,
  body("nombre").trim().notEmpty(),
  body("apellido").trim().notEmpty(),
  body("telefono").optional({ nullable: true }).trim().isLength({ max: 30 }),
  body("direccion").optional({ nullable: true }).trim(),
  validate,
  async (req: AuthRequest, res) => {
    const user = await User.findByPk(req.user!.id, { include: [{ model: Role, as: "role" }, { model: Customer, as: "customer" }] });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    await user.update({
      nombre: req.body.nombre,
      apellido: req.body.apellido,
      telefono: req.body.telefono || null,
      direccion: req.body.direccion || null
    });

    const [customer] = await Customer.findOrCreate({
      where: { usuarioId: user.id },
      defaults: {
        usuarioId: user.id,
        nombre: `${req.body.nombre} ${req.body.apellido}`,
        email: user.email,
        telefono: req.body.telefono || null,
        direccion: req.body.direccion || null,
        activo: true
      }
    });
    await customer.update({
      nombre: `${req.body.nombre} ${req.body.apellido}`,
      email: user.email,
      telefono: req.body.telefono || null,
      direccion: req.body.direccion || null
    });
    user.customer = customer;

    return res.json({ user: userPayload(user), message: "Perfil actualizado correctamente" });
  }
);

authRouter.put(
  "/me/password",
  authenticate,
  body("currentPassword").notEmpty(),
  body("newPassword").isLength({ min: 8 }),
  validate,
  async (req: AuthRequest, res) => {
    const user = await User.findByPk(req.user!.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const matches = await bcrypt.compare(req.body.currentPassword, user.password);
    if (!matches) {
      return res.status(401).json({ message: "La contraseña actual no es correcta" });
    }

    const hashed = await bcrypt.hash(req.body.newPassword, 10);
    await user.update({ password: hashed });

    return res.json({ message: "Contraseña actualizada correctamente" });
  }
);

authRouter.post("/me/profile-image", authenticate, profileImageUpload.single("image"), async (req: AuthRequest, res) => {
  if (!req.file) {
    return res.status(422).json({ message: "Imagen requerida" });
  }

  const user = await User.findByPk(req.user!.id, { include: [{ model: Role, as: "role" }, { model: Customer, as: "customer" }] });
  if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

  try {
    const result = await uploadImageBuffer(req.file.buffer, `perfil-${user.id}-${req.file.originalname}`);
    await user.update({ perfilImagenUrl: result.secure_url });
    return res.status(201).json({
      user: userPayload(user),
      image: { url: result.secure_url },
      message: "Foto de perfil actualizada correctamente"
    });
  } catch (error) {
    return res.status(500).json({ message: error instanceof Error ? error.message : "No se pudo subir la imagen" });
  }
});
